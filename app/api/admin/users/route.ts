import { NextResponse } from "next/server";
import type { AppRole } from "@prisma/client";
import { hashPassword, isDatabaseConfigured, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const demoUsers = [
  {
    id: "demo-admin",
    email: "admin@hammer.local",
    name: "Demo Admin",
    appRole: "admin",
    memberships: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ users: demoUsers, mode: "demo" });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        appRole: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                stage: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    return NextResponse.json({ users, mode: "database" });
  } catch {
    return NextResponse.json({ users: demoUsers, mode: "database-unavailable" });
  }
}

export async function POST(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "User creation requires DATABASE_URL." }, { status: 503 });
  }

  const body = await request.json();
  const email = stringField(body.email).toLowerCase();
  const name = stringField(body.name);
  const password = typeof body.password === "string" ? body.password : "";
  const appRole = appRoleField(body.appRole);

  if (!email || !name || password.length < 8) {
    return NextResponse.json({ error: "Name, email, and an 8+ character password are required." }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        appRole,
        passwordHash: hashPassword(password)
      },
      select: {
        id: true,
        email: true,
        name: true,
        appRole: true,
        createdAt: true,
        updatedAt: true,
        memberships: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: auth.user.id,
        actor: auth.user.email,
        action: "admin.user.created",
        entityType: "User",
        entityId: user.id,
        detailJson: { email, appRole }
      }
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function appRoleField(value: unknown): AppRole {
  return value === "admin" || value === "executive" || value === "producer" || value === "department_lead" ? value : "producer";
}
