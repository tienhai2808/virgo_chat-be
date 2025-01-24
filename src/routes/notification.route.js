import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getNotifications,
  createNotification,
  updateStatusNotification,
  updateSeenNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("", protectRoute, getNotifications);

router.post("/create", protectRoute, createNotification);

router.put("/update/status/:notificationId", protectRoute, updateStatusNotification);
router.put("/update/seen/", protectRoute, updateSeenNotification);

export default router;
