import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import { getRooms, getBlockedRooms, getRoom, deleteRoom } from "../controllers/room.controller.js";

const router = express.Router();

router.get("", protectRoute, getRooms);
router.get("/blocked", protectRoute, getBlockedRooms);
router.get("/:roomId", protectRoute, getRoom);

router.delete("/delete/:roomId", protectRoute, deleteRoom);

export default router;