import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createCall,
  updateParticipantCall,
  deleteAllCall,
} from "../controllers/call.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createCall);

router.put("/update/participant/:callId", protectRoute, updateParticipantCall);

router.delete("/delete/all", deleteAllCall);

export default router;