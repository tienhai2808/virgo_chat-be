import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import { sendMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.post("/send/:id", protectRoute, sendMessage)

export default router;