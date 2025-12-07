import { Plugin, PluginKey } from '@tiptap/pm/state';

export const rewriteTrackingPluginKey = new PluginKey('rewriteTracking');

interface RewriteTrackingOptions {
  userName: string;
}

export function createRewriteTrackingPlugin(options: RewriteTrackingOptions): Plugin {
  return new Plugin({
    key: rewriteTrackingPluginKey,

    appendTransaction(transactions, _oldState, newState) {
      // Only process if there were actual changes
      const docChanged = transactions.some(tr => tr.docChanged);
      if (!docChanged) return null;

      const tr = newState.tr;
      let modified = false;

      // Check for deleted blocks (empty text)
      newState.doc.descendants((node, pos) => {
        if (node.type.name !== 'rewriteBlock') return;

        const { originalText, isDeleted } = node.attrs;

        // Get current text content
        const currentText = node.textContent.trim();

        // Handle deletion: if text is empty and we had original text
        if (currentText === '' && originalText && !isDeleted) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            isDeleted: true,
            needsRewrite: false,
            lastEditedBy: options.userName,
          });
          modified = true;
        }

        // NOTE: We no longer auto-set needsRewrite: false when text differs.
        // The user must click the Submit button to confirm the rewrite.
      });

      return modified ? tr : null;
    },
  });
}
