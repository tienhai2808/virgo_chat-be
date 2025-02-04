import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import { blockUser } from "../controllers/relationship.controller.js";

const router = express.Router();

router.post("/block-user", protectRoute, blockUser);

export default router;
