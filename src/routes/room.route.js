import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getRooms,
  getRoom,
  updateNickName,
  updateRoomName,
  updateRemoveChat,
  updateSeenChat,
  deleteRoom,
} from "../controllers/room.controller.js";

const router = express.Router();

router.get("", protectRoute, getRooms);
router.get("/:roomId", protectRoute, getRoom);

router.put("/update/nick-name/:roomId", protectRoute, updateNickName);
router.put("/update/room-name/:roomId", protectRoute, updateRoomName);
router.put("/update/remove-chat/:roomId", protectRoute, updateRemoveChat);
router.put("/update/seen-chat/:roomId", protectRoute, updateSeenChat);

router.delete("/delete/:roomId", protectRoute, deleteRoom);

export default router;
