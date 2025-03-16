import express from "express";

import { protectRoute, superUserRoute } from "../middleware/auth.middleware.js";
import { getAllCharts, getAllUsers, countDimensions } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/count-dimensions", protectRoute, superUserRoute, countDimensions);
router.get("/all-users", protectRoute, superUserRoute, getAllUsers);
router.get("/all-charts", protectRoute, superUserRoute, getAllCharts);

export default router;