import express from "express";

import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createCall,
  updateParticipantCall,
  deleteAllCall,
} from "../controllers/call.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createCall);

router.put("/update/:callId/participant", protectRoute, updateParticipantCall);

//Delete DB
router.delete("/delete/all", deleteAllCall);

export default router;