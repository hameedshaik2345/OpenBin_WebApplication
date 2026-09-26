let io = null;

module.exports = {
  init: (server, corsOptions) => {
    const { Server } = require("socket.io");
    io = new Server(server, { cors: corsOptions });
    return io;
  },
  getIo: () => {
    if (!io) {
      console.warn("Socket.io not initialized");
    }
    return io;
  }
};
