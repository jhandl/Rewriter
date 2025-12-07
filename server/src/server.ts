import { Server } from '@hocuspocus/server';

const PORT = parseInt(process.env.PORT || '1234', 10);

const server = Server.configure({
  port: PORT,

  async onAuthenticate() {
    return true;
  },

  async onConnect(data) {
    console.log(`Client connected to document: ${data.documentName}`);
  },

  async onDisconnect(data) {
    console.log(`Client disconnected from document: ${data.documentName}`);
  },
});

server.listen().then(() => {
  console.log(`Hocuspocus server listening on port ${PORT}`);
});
