import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import userRouters from "./routes/user.router.js";
import roomRouters from "./routes/room.route.js";
import notificationRoutes from "./routes/notification.route.js";
import relationshipRoutes from "./routes/relationship.route.js";
import callRoutes from "./routes/call.route.js";
import adminRoutes from "./routes/admin.route.js";
import { server, app } from './services/socket.service.js';

dotenv.config();

const PORT = process.env.PORT;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }))
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRouters);
app.use("/api/rooms", roomRouters);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/relationships", relationshipRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/admin", adminRoutes);


server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
  connectDB();
});
