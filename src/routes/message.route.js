import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import { createMessage, updateMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createMessage),
router.put("/update", protectRoute, updateMessage)

export default router;