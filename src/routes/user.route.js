import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import { getUsers, getUser, searchUsers } from "../controllers/user.controller.js";

const router = express.Router();

router.get("", protectRoute, getUsers);
router.get("/search", protectRoute, searchUsers);
router.get("/:userId", protectRoute, getUser);

export default router;