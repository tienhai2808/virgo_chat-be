import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import { blockUser, getBlockedUsers, unblockUser } from "../controllers/relationship.controller.js";

const router = express.Router();

router.get("/blocked-users", protectRoute, getBlockedUsers);

router.post("/block-user", protectRoute, blockUser);

router.delete("/unblock-user", protectRoute, unblockUser);

export default router;
