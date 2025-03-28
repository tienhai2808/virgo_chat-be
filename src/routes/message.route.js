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

router.post("/create", protectRoute, createMessage);

router.put("/update/:messageId", protectRoute, updateMessage);
router.put("/update/:messageId/reaction", protectRoute, reactionMessage);

// Delete DB
router.delete("/delete/all", deleteAllMessage);

router.delete("/delete/:messageId", protectRoute, deleteMessage);

export default router;
