import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getRooms,
  getRoom,
  updateNickName,
  updateRoomName,
  updateRemoveChat,
  updateSeenChat,
  updateKickMember,
  deleteRoom,
} from "../controllers/room.controller.js";

const router = express.Router();

router.get("", protectRoute, getRooms);
router.get("/:roomId", protectRoute, getRoom);

router.put("/:roomId/nick-name/", protectRoute, updateNickName);
router.put("/:roomId/room-name", protectRoute, updateRoomName);
router.put("/:roomId/remove-chat", protectRoute, updateRemoveChat);
router.put("/:roomId/seen-chat", protectRoute, updateSeenChat);
router.put("/:roomId/kick-member", protectRoute, updateKickMember);

router.delete("/:roomId", protectRoute, deleteRoom);

export default router;
