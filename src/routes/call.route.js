import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createCall,
  updateParticipantCall,
  updateStatusCall,
} from "../controllers/call.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createCall);

router.put("/update/participant/:callId", protectRoute, updateParticipantCall);
router.put("/update/status/:callId", protectRoute, updateStatusCall);