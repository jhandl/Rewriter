# Collaborative Rewrite Editor

A real-time collaborative text editor for rewriting documents with paragraph-level tracking.

## Features

- Real-time collaboration via WebSockets
- Paragraph-level rewrite tracking
- Original text preservation and comparison
- Multi-user cursor support
- File import/export with progress tracking

## Local Development

### Prerequisites
- Node.js 20+
- npm

### Start the server
```bash
cd server
npm install
npm run dev
```

### Start the client
```bash
cd client
npm install
npm run dev
```

Then open http://localhost:5173

---

## Deployment

### Server (Fly.io)

1. Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/

2. Login to Fly:
```bash
fly auth login
```

3. Create and deploy the app:
```bash
cd server
fly launch --name your-app-name --region iad --no-deploy
fly deploy
```

4. Note your app URL: `https://your-app-name.fly.dev`

### Client (Vercel)

1. Push your code to GitHub

2. Go to https://vercel.com and import your repository

3. Configure the project:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite
   - **Environment Variables**:
     - `VITE_WS_URL` = `wss://your-app-name.fly.dev`

4. Deploy!

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_WS_URL` | WebSocket server URL | `wss://your-app.fly.dev` |
| `PORT` (server) | Server port (auto-set by Fly.io) | `8080` |

---

## Project Structure

```
├── client/           # React/Vite frontend
│   ├── src/
│   │   ├── editor/   # TipTap editor components
│   │   ├── App.tsx   # Main app with user prompt
│   │   └── main.tsx  # Entry point
│   └── vercel.json   # Vercel config
│
├── server/           # Hocuspocus WebSocket server
│   ├── src/
│   │   └── server.ts # Server entry point
│   ├── Dockerfile    # Docker build for Fly.io
│   └── fly.toml      # Fly.io config
│
└── start.sh          # Local dev start script
```
