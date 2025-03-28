import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import { getBlockedRelationships, createBlockRelationship, unBlockUser } from "../controllers/relationship.controller.js";

const router = express.Router();

router.get("/blocked", protectRoute, getBlockedRelationships);

router.post("/block", protectRoute, createBlockRelationship);

router.delete("/:blockedUserId/unblock", protectRoute, unBlockUser);

export default router;
