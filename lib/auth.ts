import { createHmac, randomBytes, timingSafeEqual, pbkdf2Sync } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type AppRole = "admin" | "executive" | "producer" | "department_lead";
export type ProjectRole = "owner" | "executive" | "producer" | "department_lead" | "viewer";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  appRole: AppRole;
  projectRoles: Record<string, ProjectRole>;
}

type UserWithMemberships = Prisma.UserGetPayload<{ include: { memberships: true } }>;

export const SESSION_COOKIE_NAME = "hammer_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const demoUser: AuthenticatedUser = {
  id: "demo-admin",
  email: "admin@hammer.local",
  name: "Demo Admin",
  appRole: "admin",
  projectRoles: {}
};

function isPostgresUrlConfigured() {
  return Boolean(process.env.DATABASE_URL?.startsWith("postgresql://") || process.env.DATABASE_URL?.startsWith("postgres://"));
}

function getConfiguredDataMode() {
  return (process.env.GREENLIGHT_DATA_MODE ?? process.env.HAMMER_DATA_MODE ?? "").trim().toLowerCase();
}

export function isDatabaseConfigured() {
  const dataMode = getConfiguredDataMode();
  if (dataMode === "demo" || dataMode === "local") return false;
  if (dataMode === "database" || dataMode === "production") return isPostgresUrlConfigured();
  if (process.env.NODE_ENV === "development") return false;
  return isPostgresUrlConfigured();
}

export function getDemoUser() {
  return demoUser;
}

export function createSessionCookie(user: AuthenticatedUser) {
  const payload = {
    ...user,
    exp: Date.now() + sessionTtlMs()
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function readUserFromRequest(request: Request): AuthenticatedUser | null {
  if (!isDatabaseConfigured()) return demoUser;

  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  return token ? readUserFromToken(token) : null;
}

export function readUserFromToken(token: string): AuthenticatedUser | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !safeEqual(signature, sign(encoded))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AuthenticatedUser & { exp?: number };
    if (!payload.exp || payload.exp < Date.now()) return null;
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      appRole: payload.appRole,
      projectRoles: payload.projectRoles ?? {}
    };
  } catch {
    return null;
  }
}

export function requireUser(request: Request) {
  const user = readUserFromRequest(request);
  if (!user) {
    return { error: "Authentication required.", status: 401 as const };
  }
  return { user };
}

export function requireAdmin(request: Request) {
  const auth = requireUser(request);
  if ("error" in auth) return auth;
  if (auth.user.appRole !== "admin") {
    return { error: "Admin access required.", status: 403 as const };
  }
  return auth;
}

export function userCanAccessProject(user: AuthenticatedUser, projectId: string) {
  return user.appRole === "admin" || Boolean(user.projectRoles[projectId]);
}

export function userCanManageProject(user: AuthenticatedUser, projectId: string) {
  const projectRole = user.projectRoles[projectId];
  return user.appRole === "admin" || projectRole === "owner" || projectRole === "producer";
}

export function userCanApprove(user: AuthenticatedUser, projectId: string) {
  const projectRole = user.projectRoles[projectId];
  return user.appRole === "admin" || projectRole === "owner" || projectRole === "producer" || projectRole === "department_lead";
}

export function userCanUploadScripts(user: AuthenticatedUser, projectId: string) {
  const projectRole = user.projectRoles[projectId];
  return user.appRole === "admin" || projectRole === "owner" || projectRole === "producer";
}

export function forbidden() {
  return { error: "You do not have access to this project.", status: 403 as const };
}

export function shouldUseSecureCookies() {
  return (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
}

export async function authenticateWithPassword(email: string, password: string) {
  if (!isDatabaseConfigured()) {
    return demoUser;
  }

  const normalizedEmail = email.trim().toLowerCase();
  let user: UserWithMemberships | null;
  try {
    user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { memberships: true }
    });
  } catch {
    return null;
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    const bootstrapEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const bootstrapPassword = process.env.ADMIN_PASSWORD;
    if (bootstrapEmail && bootstrapPassword && normalizedEmail === bootstrapEmail && password === bootstrapPassword) {
      return createBootstrapAdmin(normalizedEmail, password);
    }
    return null;
  }

  return toAuthenticatedUser(user);
}

export async function createBootstrapAdmin(email: string, password: string) {
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "System Admin",
      appRole: "admin",
      passwordHash: hashPassword(password)
    },
    update: {},
    include: { memberships: true }
  });

  return toAuthenticatedUser(user);
}

export async function upsertGoogleUser(profile: { id: string; email: string; name?: string; picture?: string }) {
  if (!isDatabaseConfigured()) {
    return {
      ...demoUser,
      email: profile.email,
      name: profile.name ?? profile.email
    };
  }

  const email = profile.email.trim().toLowerCase();
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: profile.name ?? email,
      avatarUrl: profile.picture,
      googleId: profile.id,
      role: "PRODUCER",
      appRole: "producer"
    },
    update: {
      name: profile.name ?? email,
      avatarUrl: profile.picture,
      googleId: profile.id
    },
    include: { memberships: true }
  });

  return toAuthenticatedUser(user);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [algorithm, iterations, salt, expectedHash] = encoded.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterations || !salt || !expectedHash) return false;

  const actualHash = pbkdf2Sync(password, salt, Number(iterations), 32, "sha256").toString("hex");
  return safeEqual(actualHash, expectedHash);
}

function toAuthenticatedUser(user: {
  id: string;
  email: string;
  name: string;
  appRole: AppRole;
  memberships: Array<{ projectId: string; role: ProjectRole }>;
}): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    appRole: user.appRole,
    projectRoles: Object.fromEntries(user.memberships.map((membership) => [membership.projectId, membership.role]))
  };
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sessionSecret() {
  return process.env.SESSION_SECRET ?? "hammer-local-development-session-secret";
}

function sessionTtlMs() {
  return SESSION_MAX_AGE_SECONDS * 1000;
}
