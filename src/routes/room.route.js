import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import { getRooms, getRoom, updateNickName, deleteRoom, deleteNickName } from "../controllers/room.controller.js";

const router = express.Router();

router.get("", protectRoute, getRooms);
router.get("/:roomId", protectRoute, getRoom);

router.put("/update/nick-name/:roomId", protectRoute, updateNickName);

router.delete("/delete/nick-name/:roomId", protectRoute, deleteNickName);
router.delete("/delete/:roomId", protectRoute, deleteRoom);

export default router;