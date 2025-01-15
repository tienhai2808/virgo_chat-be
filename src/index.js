import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "passport"
import session from "express-session"

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import googleRoutes from "./routes/google.route.js";
import "./config/passport.config.js"

dotenv.config();
const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/api/auth", authRoutes);
app.use("/api/message", messageRoutes);
app.use("/auth", googleRoutes)

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
  connectDB();
});
