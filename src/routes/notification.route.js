import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getNotifications,
  createNotification,
  updateStatusNotification,
  updateSeenNotification,
  deleteNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("", protectRoute, getNotifications);

router.post("", protectRoute, createNotification);

router.put("/:notificationId/status", protectRoute, updateStatusNotification);
router.put("/seen", protectRoute, updateSeenNotification);

router.delete("/:notificationId", protectRoute, deleteNotification);

export default router;
