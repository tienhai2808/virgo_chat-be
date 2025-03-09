import express from "express";

import { protectRoute, superUserRoute } from "../middleware/auth.middleware.js";
import { getAllCharts, getAllUsers, countDimensions } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/count-dimensions", countDimensions);
router.get("/all-users", protectRoute, superUserRoute, getAllUsers);
router.get("/all-charts", getAllCharts);

export default router;