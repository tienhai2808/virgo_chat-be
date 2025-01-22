import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

export const getReceiverSocketId = (userId) => {
  return userSocketMap.get(userId) || [];
};

const userSocketMap = new Map();

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, []);
    }
    userSocketMap.get(userId).push(socket.id);
  }

  io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));

  socket.on("disconnect", () => {
    for (const [key, value] of userSocketMap.entries()) {
      const updatedSockets = value.filter((id) => id !== socket.id);
      
      if (updatedSockets.length === 0) {
        userSocketMap.delete(key);
      } else {
        userSocketMap.set(key, updatedSockets);
      }
    }

    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
  });
});

export { io, server, app };
