import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import { getRoomForSideBar, getMessages, sendMessage, createPrivateRoom } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/rooms", protectRoute, getRoomForSideBar)
router.get("/rooms/:roomId", protectRoute, getMessages)

router.post("/create/private-room", protectRoute, createPrivateRoom)

router.post("/send/:id", protectRoute, sendMessage)

export default router;