import type { NextFunction, Request, Response } from "express";
import { getUserById, verifyToken, type AuthUser } from "../services/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  let claims;
  try {
    claims = verifyToken(header.slice(7));
  } catch {
    res.status(401).json({ error: "Invalid bearer token" });
    return;
  }

  const user = await getUserById(claims.sub);
  if (!user) {
    res.status(401).json({ error: "Unknown user" });
    return;
  }

  req.user = user;
  next();
}