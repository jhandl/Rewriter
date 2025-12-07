# Collaborative Rewrite Editor Architecture (TipTap + ProseMirror + Yjs)

This document describes a self‑hosted, real‑time collaborative text editor designed for rewrite workflows. It ensures:

- Paragraph/sentence‑level rewrite tracking  
- Automatic detection of rewritten blocks  
- Preservation of original text per block  
- Real‑time synchronization for multiple collaborators  
- UI allowing users to reveal the original text on demand  

The system uses:

- **TipTap** (rich‑text editor)  
- **ProseMirror** (editor engine)  
- **Yjs** (CRDT‑based real‑time sync)  
- **Hocuspocus** (WebSocket collaboration server)

---

## 1. System Overview

### Requirements

- Real‑time collaboration & presence  
- Replace‑by‑rewrite workflow (no manual highlight removal)  
- Block‑level (sentence/paragraph) rewrite tracking  
- Original version preserved and revealable per block  
- Visual indication of rewritten vs. pending blocks  
- Self‑hosted deployment

### Architecture Summary

- **Client:** React + TipTap + Yjs  
- **Server:** Node.js + Hocuspocus  
- **Nodes:** Each block (paragraph/sentence) stored as a `rewriteBlock` node  
- **Metadata per block:**  
  - `needsRewrite: boolean`  
  - `originalText: string | null`  
- **Rewrite Detection:** A ProseMirror plugin compares edited text vs. original using a similarity threshold.

---

## 2. Directory Structure

```
rewrite-collab/
  server/
    src/server.ts
    package.json
  client/
    src/
      App.tsx
      main.tsx
      editor/
        Editor.tsx
        rewriteBlockExtension.ts
        rewriteDiffPlugin.ts
        types.ts
    package.json
    index.html
```

---

## 3. Collaboration Server (Hocuspocus)

A simple WebSocket collaboration server:

```ts
import { Server } from '@hocuspocus/server';

const server = Server.configure({
  port: 1234,
  onConnect(data) {
    console.log("Client connected:", data.documentName);
  },
});

server.listen();
```

This provides real‑time Yjs synchronization.

---

## 4. Client Architecture

### Frameworks Used

- **TipTap** for rich‑text handling  
- **ProseMirror** for document schema and plugins  
- **Hocuspocus Provider** for sync  
- **React** for UI rendering  

### Initialization Notes

- All original paragraphs are turned into `rewriteBlock` nodes on load.  
- Each block is initialized with:  
  ```json
  {
    "needsRewrite": true,
    "originalText": "<original>"
  }
  ```

---

## 5. RewriteBlock Node Extension

Defines a block with metadata and UI for showing the original version:

Key behaviours:

- Displays original text via a hover/button  
- Highlights blocks pending rewrite  
- Removes highlight automatically when rewritten

The node uses a React NodeView for advanced rendering.

---

## 6. Rewrite Detection Plugin

A ProseMirror plugin performs:

1. Text comparison between old and new block text  
2. Calculation of similarity ratio  
3. If similarity < threshold (default 0.5), mark block as rewritten  
4. Store original text persistently in node attributes  

This ensures a block is only marked “rewritten” when substantially modified.

---

## 7. Editor Setup

TipTap editor configuration includes:

- `StarterKit` minus default paragraph  
- `RewriteBlock` extension  
- Collaboration extensions (`Collaboration`, `CollaborationCursor`)  
- Rewrite diff plugin

The initial content can be loaded from a backend or embedded directly.

---

## 8. Running the System

### Start the server

```
cd server
npm install
npm run dev
```

Server will listen on:

```
ws://localhost:1234
```

### Start the client

```
cd client
npm install
npm run dev
```

Client usually served at:

```
http://localhost:5173
```

### Result

- Multiple users can collaborate in real time  
- Blocks needing rewrite appear highlighted  
- Fully rewritten blocks lose highlight automatically  
- A “Show Original” button reveals previous text for each block  

---

## 9. Extending to Sentence-Level Blocks

To operate at sentence level:

- Pre‑split input text into sentences  
- Construct one `rewriteBlock` node per sentence  
- Use identical metadata and rewrite logic  
- Optional: group sentences into paragraphs in read‑only views

This gives precise rewrite tracking appropriate for dialect conversion workflows.

---

## 10. Future Extensions

- Replace simple similarity with Levenshtein distance  
- Add backend persistence (PostgreSQL/Redis) for documents  
- Add authentication & user identity  
- Add completion metrics for progress tracking  
- Support export to markdown / docx / PDF

---

## 11. Summary

**TipTap + ProseMirror + Yjs** is the best foundation for a collaborative rewrite-tracking editor because:

- It supports structured nodes with granular metadata  
- Provides CRDT-based real-time sync  
- Allows custom state transitions and rewrite detection  
- Supports custom UI for original-version reveal  
- Is fully self‑hostable  

This architecture meets all requirements: real‑time collaboration, rewrite workflow automation, and user-friendly inspection of original vs rewritten text.

---
