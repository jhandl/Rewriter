import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import React, { useState, useEffect, useRef } from 'react';

// Custom event for block activation
const BLOCK_ACTIVATED_EVENT = 'rewriteBlockActivated';
// Custom event for Tab key to submit current block
const TAB_SUBMIT_EVENT = 'rewriteBlockTabSubmit';

// React component for rendering a RewriteBlock
const RewriteBlockView: React.FC<{ node: any; updateAttributes: (attrs: any) => void; getPos: () => number; editor: any }> = ({
  node,
  updateAttributes,
  getPos,
  editor,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const { needsRewrite, originalText, isDeleted, lastEditedBy } = node.attrs;

  // Get current text content
  const currentText = node.textContent?.trim() || '';

  // Check if text has been modified from original
  const hasChanges = originalText && currentText !== originalText;

  // Get this block's position
  const myPos = typeof getPos === 'function' ? getPos() : -1;

  // Use refs to avoid stale closures in event listeners
  const stateRef = useRef({ showOriginal, hasChanges, needsRewrite, myPos });
  useEffect(() => {
    stateRef.current = { showOriginal, hasChanges, needsRewrite, myPos };
  }, [showOriginal, hasChanges, needsRewrite, myPos]);

  // Listen for other blocks being activated
  useEffect(() => {
    const handleOtherBlockActivated = (e: CustomEvent) => {
      const activatedPos = e.detail.pos;
      const { showOriginal, hasChanges, needsRewrite, myPos } = stateRef.current;

      // If another block was activated and we're showing original, close and submit
      if (activatedPos !== myPos && showOriginal && hasChanges && needsRewrite) {
        setShowOriginal(false);
        updateAttributes({ needsRewrite: false });
      }
    };

    window.addEventListener(BLOCK_ACTIVATED_EVENT, handleOtherBlockActivated as EventListener);
    return () => {
      window.removeEventListener(BLOCK_ACTIVATED_EVENT, handleOtherBlockActivated as EventListener);
    };
  }, [updateAttributes]);

  // Listen for Tab submit event
  useEffect(() => {
    const handleTabSubmit = () => {
      const { showOriginal, hasChanges, needsRewrite } = stateRef.current;
      if (showOriginal && hasChanges && needsRewrite) {
        setShowOriginal(false);
        updateAttributes({ needsRewrite: false });
      }
    };

    window.addEventListener(TAB_SUBMIT_EVENT, handleTabSubmit);
    return () => {
      window.removeEventListener(TAB_SUBMIT_EVENT, handleTabSubmit);
    };
  }, [updateAttributes]);

  // Auto-show original when user starts typing (text differs from original)
  useEffect(() => {
    if (needsRewrite && hasChanges) {
      setShowOriginal(true);
      // Notify other blocks that this one is now active
      window.dispatchEvent(new CustomEvent(BLOCK_ACTIVATED_EVENT, { detail: { pos: myPos } }));
    }
  }, [hasChanges, needsRewrite, myPos]);

  // Hide original when block is submitted (needsRewrite becomes false)
  useEffect(() => {
    if (!needsRewrite) {
      setShowOriginal(false);
    }
  }, [needsRewrite]);

  // Handle close/submit button click
  const handleClose = () => {
    setShowOriginal(false);
    if (hasChanges) {
      updateAttributes({ needsRewrite: false });
    }
  };

  // Handle revert - restore original text and set needsRewrite back to true
  const handleRevert = () => {
    if (originalText && editor) {
      // Use editor commands to replace the content
      const pos = getPos();
      const nodeSize = node.nodeSize;

      // Delete current content and insert original
      editor.chain()
        .focus()
        .deleteRange({ from: pos + 1, to: pos + nodeSize - 1 })
        .insertContentAt(pos + 1, originalText)
        .run();

      updateAttributes({ needsRewrite: true });
      setShowOriginal(false);
    }
  };

  // Deleted block - show placeholder
  if (isDeleted) {
    return (
      <NodeViewWrapper className="rewrite-block deleted">
        <div className="deleted-placeholder">
          <span className="deleted-icon">⊘</span>
          <span className="deleted-label">Block deleted</span>
          {lastEditedBy && <span className="edited-by">by {lastEditedBy}</span>}
          {originalText && (
            <button
              className="show-original-btn"
              onClick={() => setShowOriginal(!showOriginal)}
            >
              {showOriginal ? 'Hide Original' : 'Show Original'}
            </button>
          )}
        </div>
        {showOriginal && originalText && (
          <div className="original-text-popover">
            <div className="original-label">Original text:</div>
            <div className="original-content">{originalText}</div>
          </div>
        )}
      </NodeViewWrapper>
    );
  }

  // Block still needs rewriting
  if (needsRewrite) {
    return (
      <NodeViewWrapper className={`rewrite-block needs-rewrite ${hasChanges ? 'editing' : ''}`}>
        {/* Show original text above when user has started typing */}
        {showOriginal && originalText && (
          <div className="original-text-popover">
            <div className="original-label">Original text:</div>
            <div className="original-content">{originalText}</div>
          </div>
        )}
        <div className="block-content-wrapper">
          <NodeViewContent className="block-content" />
          <div className="block-actions">
            {showOriginal && (
              <button
                className="show-original-btn"
                onClick={handleClose}
                title="Close and submit (Tab)"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // Already rewritten block - show eye icon and revert icon
  return (
    <NodeViewWrapper className="rewrite-block rewritten">
      {showOriginal && originalText && (
        <div className="original-text-popover">
          <div className="original-label">Original text:</div>
          <div className="original-content">{originalText}</div>
        </div>
      )}
      <div className="block-content-wrapper">
        <NodeViewContent className="block-content" />
        <div className="block-actions">
          {originalText && (
            <>
              <button
                className="show-original-btn"
                onClick={() => setShowOriginal(!showOriginal)}
                title="Show original text"
              >
                {showOriginal ? '✕' : '👁'}
              </button>
              <button
                className="revert-btn"
                onClick={handleRevert}
                title="Revert to original"
              >
                ↩
              </button>
            </>
          )}
          {lastEditedBy && (
            <span className="edited-by-badge" title={`Edited by ${lastEditedBy}`}>
              ✓ {lastEditedBy}
            </span>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
};

// TipTap extension for RewriteBlock
export const RewriteBlock = Node.create({
  name: 'rewriteBlock',

  group: 'block',

  content: 'inline*',

  addAttributes() {
    return {
      needsRewrite: {
        default: true,
      },
      originalText: {
        default: null,
      },
      isDeleted: {
        default: false,
      },
      lastEditedBy: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-rewrite-block]',
      },
      {
        tag: 'p',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-rewrite-block': '' }), 0];
  },

  addKeyboardShortcuts() {
    return {
      // Insert a hard break (newline) instead of creating a new block
      Enter: () => this.editor.commands.setHardBreak(),
      // Tab to submit the current edit
      Tab: () => {
        window.dispatchEvent(new CustomEvent(TAB_SUBMIT_EVENT));
        return true; // Prevents default tab behavior
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(RewriteBlockView);
  },
});

export default RewriteBlock;
