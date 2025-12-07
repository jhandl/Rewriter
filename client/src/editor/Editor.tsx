import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { RewriteBlock } from './rewriteBlockExtension';
import { createRewriteTrackingPlugin, rewriteTrackingPluginKey } from './rewriteTrackingPlugin';
import { UserInfo } from './types';

interface EditorProps {
  documentName: string;
  user: UserInfo;
}

// Metadata marker for in-progress files
const METADATA_MARKER = '\n\n---REWRITE_METADATA---\n';

interface FileMetadata {
  originalFilename: string;
  unmodifiedBlocks: number[]; // indices of blocks that still need rewriting
  originalTexts: string[]; // original text for each block
}

// Parse file content and extract metadata if present
function parseFileContent(content: string): { lines: string[]; metadata: FileMetadata | null } {
  const metadataIndex = content.indexOf(METADATA_MARKER);

  if (metadataIndex === -1) {
    // No metadata - fresh file
    const lines = content.split(/\n/).filter(line => line.trim());
    return { lines, metadata: null };
  }

  // Extract content and metadata
  const textContent = content.substring(0, metadataIndex);
  const metadataJson = content.substring(metadataIndex + METADATA_MARKER.length).trim();

  try {
    const metadata = JSON.parse(metadataJson) as FileMetadata;
    const lines = textContent.split(/\n/).filter(line => line.trim());
    return { lines, metadata };
  } catch {
    // Invalid metadata, treat as fresh file
    const lines = content.split(/\n/).filter(line => line.trim());
    return { lines, metadata: null };
  }
}

// Convert parsed content to rewriteBlock nodes
function createRewriteBlocks(lines: string[], metadata: FileMetadata | null) {
  return {
    type: 'doc',
    content: lines.map((line, index) => {
      const needsRewrite = metadata
        ? metadata.unmodifiedBlocks.includes(index)
        : true; // Fresh file - all blocks need rewriting

      const originalText = metadata?.originalTexts[index] || line.trim();

      return {
        type: 'rewriteBlock',
        attrs: {
          needsRewrite,
          originalText,
          isDeleted: false,
          lastEditedBy: null,
        },
        content: [
          {
            type: 'text',
            text: line.trim(),
          },
        ],
      };
    }),
  };
}

// Inner component that only renders when provider is ready
const EditorInner: React.FC<{
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  user: UserInfo;
  status: 'connecting' | 'connected' | 'disconnected';
  loadedFilename: string | null;
  setLoadedFilename: (name: string | null) => void;
}> = ({ ydoc, provider, user, status, loadedFilename, setLoadedFilename }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalTextsRef = useRef<string[]>([]);

  // Get the Yjs fragment for syncing
  const fragment = ydoc.getXmlFragment('prosemirror');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        history: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
      }),
      RewriteBlock,
      Collaboration.configure({
        fragment: fragment,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: user.name,
          color: user.color,
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose-editor',
      },
    },
  });

  // Add rewrite tracking plugin when editor is ready
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const plugin = createRewriteTrackingPlugin({ userName: user.name });
      editor.registerPlugin(plugin);

      return () => {
        editor.unregisterPlugin(rewriteTrackingPluginKey);
      };
    }
  }, [editor, user.name]);

  const handleLoadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    // Extract base filename (remove extension and any status suffix)
    let baseName = file.name.replace(/\.(txt|md)$/i, '');
    baseName = baseName.replace(/ - (in progress|finished)$/i, '');
    setLoadedFilename(baseName);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const { lines, metadata } = parseFileContent(text);
        const content = createRewriteBlocks(lines, metadata);

        // Store original texts for saving later
        originalTextsRef.current = metadata?.originalTexts || lines.map(l => l.trim());

        editor.commands.clearContent();
        editor.commands.setContent(content);
      }
    };
    reader.readAsText(file);

    event.target.value = '';
  };

  const handleSaveFile = () => {
    if (!editor || !loadedFilename) return;

    // Collect block data
    const blocks: { text: string; needsRewrite: boolean; originalText: string }[] = [];
    let blockIndex = 0;

    editor.state.doc.descendants((node) => {
      if (node.type.name === 'rewriteBlock' && !node.attrs.isDeleted) {
        const text = node.textContent.trim();
        if (text) {
          blocks.push({
            text,
            needsRewrite: node.attrs.needsRewrite,
            originalText: node.attrs.originalText || text,
          });
        }
        blockIndex++;
      }
    });

    // Check if all blocks are done
    const unmodifiedIndices = blocks
      .map((block, idx) => block.needsRewrite ? idx : -1)
      .filter(idx => idx !== -1);

    const isFinished = unmodifiedIndices.length === 0;

    // Build content
    const textContent = blocks.map(b => b.text).join('\n');

    let finalContent: string;
    let suffix: string;

    if (isFinished) {
      // Finished - no metadata needed
      finalContent = textContent;
      suffix = ' - finished';
    } else {
      // In progress - add metadata
      const metadata: FileMetadata = {
        originalFilename: loadedFilename,
        unmodifiedBlocks: unmodifiedIndices,
        originalTexts: blocks.map(b => b.originalText),
      };
      finalContent = textContent + METADATA_MARKER + JSON.stringify(metadata, null, 2);
      suffix = ' - in progress';
    }

    // Create and download file
    const blob = new Blob([finalContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${loadedFilename}${suffix}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="editor-container">
      <div className="editor-header">
        <div className="connection-status">
          <span className={`status-dot ${status}`}></span>
          {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </div>
        {loadedFilename && (
          <div className="document-name">
            📄 {loadedFilename}
          </div>
        )}
        <div className="header-actions">
          <button onClick={handleLoadFile} className="load-file-btn">
            📂 Load File
          </button>
          <button onClick={handleSaveFile} className="save-file-btn" disabled={!loadedFilename}>
            💾 Save File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        <div className="user-info">
          <span className="user-color" style={{ backgroundColor: user.color }}></span>
          {user.name}
        </div>
      </div>
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
};

// Main Editor component - handles provider lifecycle
export const Editor: React.FC<EditorProps> = ({ documentName, user }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [isReady, setIsReady] = useState(false);
  const [loadedFilename, setLoadedFilename] = useState<string | null>(null);

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);

  // Initialize provider after mount
  useEffect(() => {
    const doc = new Y.Doc();
    const prov = new HocuspocusProvider({
      url: import.meta.env.VITE_WS_URL || 'ws://localhost:1234',
      name: documentName,
      document: doc,
      token: 'anonymous',
      onConnect: () => setStatus('connected'),
      onDisconnect: () => setStatus('disconnected'),
    });

    ydocRef.current = doc;
    providerRef.current = prov;
    setIsReady(true);

    return () => {
      prov.destroy();
    };
  }, [documentName]);

  // Show loading state while connecting
  if (!isReady || !providerRef.current || !ydocRef.current) {
    return (
      <div className="editor-container">
        <div className="editor-loading">Connecting to collaboration server...</div>
      </div>
    );
  }

  return (
    <EditorInner
      ydoc={ydocRef.current}
      provider={providerRef.current}
      user={user}
      status={status}
      loadedFilename={loadedFilename}
      setLoadedFilename={setLoadedFilename}
    />
  );
};

export default Editor;
