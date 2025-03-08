import express from "express";

import { protectRoute, superUserRoute } from "../middleware/auth.middleware.js";
import { getOnlineUsers, getAllUsers } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/online-users", protectRoute, superUserRoute, getOnlineUsers);
router.get("/all-users", protectRoute, superUserRoute, getAllUsers);

export default router;