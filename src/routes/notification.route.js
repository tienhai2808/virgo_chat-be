import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getNotifications,
  createPrivateNotification,
  createGroupNotification,
  updateStatusNotification,
  updateSeenNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("", protectRoute, getNotifications);

router.post("/private/create", protectRoute, createPrivateNotification);
router.post("/group/create", protectRoute, createGroupNotification);

router.put("/update/status/:notificationId", protectRoute, updateStatusNotification);
router.put("/update/seen/", protectRoute, updateSeenNotification);

export default router;
