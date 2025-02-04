import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import { createMessage, updateMessage, deleteMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createMessage),
router.put("/update/:messageId", protectRoute, updateMessage);
router.delete("/delete/:messageId", protectRoute, deleteMessage);

export default router;