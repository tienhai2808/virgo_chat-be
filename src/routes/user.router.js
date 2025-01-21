import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import { getUsers, getUser } from "../controllers/user.controller.js";

const router = express.Router();

router.get("", protectRoute, getUsers);
router.get("/:userId", protectRoute, getUser);

export default router;