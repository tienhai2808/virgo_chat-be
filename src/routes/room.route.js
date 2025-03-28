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

router.put("/update/:roomId/nick-name/", protectRoute, updateNickName);
router.put("/update/:roomId/room-name", protectRoute, updateRoomName);
router.put("/update/:roomId/remove-chat", protectRoute, updateRemoveChat);
router.put("/update/:roomId/seen-chat", protectRoute, updateSeenChat);
router.put("/update/:roomId/kick-member", protectRoute, updateKickMember);

router.delete("/delete/:roomId", protectRoute, deleteRoom);

export default router;
