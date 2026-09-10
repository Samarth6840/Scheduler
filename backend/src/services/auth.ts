import jwt from "jsonwebtoken";
import { pool } from "../db/index.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/errors.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

export interface JwtClaims {
  sub: string;
  email: string;
  name: string | null;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    env.jwtSecret,
    { expiresIn: "7d" },
  );
}

export function verifyToken(token: string): JwtClaims {
  try {
    return jwt.verify(token, env.jwtSecret) as JwtClaims;
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
}

export function googleLoginUrl(): string {
  const { clientId } = env.google;
  if (!clientId) throw new HttpError(501, "Google OAuth is not configured (GOOGLE_CLIENT_ID)");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: env.google.callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function completeGoogleLogin(code: string): Promise<{ user: AuthUser; token: string }> {
  const { clientId, clientSecret, callbackUrl } = env.google;
  if (!clientId || !clientSecret) {
    throw new HttpError(501, "Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    throw new HttpError(400, `Google token exchange failed with ${tokenResponse.status}`);
  }
  const token = (await tokenResponse.json()) as { access_token?: string; error?: string };
  if (!token.access_token) {
    throw new HttpError(400, `Google token exchange failed: ${token.error ?? "missing access_token"}`);
  }

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) {
    throw new HttpError(400, `Google userinfo request failed with ${profileResponse.status}`);
  }
  const profile = (await profileResponse.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  const id = `google:${profile.sub ?? "unknown"}`;
  const user = await upsertUser({
    id,
    email: profile.email ?? id,
    name: profile.name ?? null,
    avatar: profile.picture ?? null,
  });

  return { user, token: signToken(user) };
}

export async function upsertUser(input: {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}): Promise<AuthUser> {
  const result = await pool.query(
    `INSERT INTO users (id, email, name, avatar)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email, name = EXCLUDED.name, avatar = EXCLUDED.avatar
     RETURNING id, email, name, avatar`,
    [input.id, input.email, input.name, input.avatar],
  );
  return mapAuthUser(result.rows[0] as Record<string, unknown>);
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const result = await pool.query(
    `SELECT id, email, name, avatar FROM users WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return null;
  return mapAuthUser(row as Record<string, unknown>);
}

function mapAuthUser(row: Record<string, unknown>): AuthUser {
  return {
    id: String(row.id),
    email: String(row.email),
    name: row.name == null ? null : String(row.name),
    avatar: row.avatar == null ? null : String(row.avatar),
  };
}