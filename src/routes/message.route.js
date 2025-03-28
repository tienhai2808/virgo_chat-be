import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createMessage,
  updateMessage,
  reactionMessage,
  deleteMessage,
  deleteAllMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

router.post("", protectRoute, createMessage);

router.put("/:messageId", protectRoute, updateMessage);
router.put("/:messageId/reaction", protectRoute, reactionMessage);

// Delete DB
router.delete("/all", deleteAllMessage);

router.delete("/:messageId", protectRoute, deleteMessage);

export default router;
