import express from "express";
import passport from "passport";

import { googleCallBack, googleLogout } from "../controllers/google.controller.js";

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  googleCallBack
);
router.get("/auth/logout", googleLogout);

export default router;
