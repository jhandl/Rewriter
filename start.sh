#!/bin/bash

# Kill any existing processes
echo "Stopping existing processes..."
pkill -f "tsx watch src/server.ts" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1

# Start server in background
echo "Starting server..."
cd /Users/jhandl/Editor/server
npm run dev &
SERVER_PID=$!
sleep 2

# Start client in background
echo "Starting client..."
cd /Users/jhandl/Editor/client
npm run dev &
CLIENT_PID=$!
sleep 3

echo ""
echo "=========================================="
echo "  Server running on: ws://localhost:1234"
echo "  Client running on: http://localhost:5173"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for either to exit
wait
