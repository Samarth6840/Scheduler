import { Router } from "express";
import { env } from "../config/env.js";
import { completeGoogleLogin, googleLoginUrl } from "../services/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/google", (_req, res) => {
  res.redirect(googleLoginUrl());
});

router.get("/google/callback", async (req, res) => {
  const code = req.query.code;
  if (typeof code !== "string" || code === "") {
    res.status(400).json({ error: "Missing code parameter" });
    return;
  }
  const { token } = await completeGoogleLogin(code);
  res.redirect(`${env.frontendUrl}/?token=${encodeURIComponent(token)}`);
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;