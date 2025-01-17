import express from "express";

import {
  signup,
  login,
  logout,
  loginGoogle,
  loginFacebook,
  loginFaceId,
  updateAvatar,
  updateFaceId,
  updateInfo,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.post("/login/google", loginGoogle);
router.post("/login/facebook", loginFacebook);
router.post("/login/faceid", loginFaceId);

router.put("/update/avatar", protectRoute, updateAvatar);
router.put("/update/info", protectRoute, updateInfo);
router.put("/update/face-id", protectRoute, updateFaceId);

export default router;
