import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import { getNotifications, createNotification } from "../controllers/notification.controller.js";

const router = express.Router();

router.get("", protectRoute, getNotifications);
router.post("/create", protectRoute, createNotification);

export default router;