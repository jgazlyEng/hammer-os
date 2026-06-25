import { NextResponse } from "next/server";
import type { AppRole, Prisma } from "@prisma/client";
import { hashPassword, isDatabaseConfigured, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "User updates require DATABASE_URL." }, { status: 503 });
  }

  const body = await request.json();
  const password = typeof body.password === "string" ? body.password : "";
  const data: Prisma.UserUpdateInput = {
    name: optionalString(body.name),
    email: optionalString(body.email)?.toLowerCase(),
    appRole: optionalAppRole(body.appRole),
    passwordHash: password.length ? hashPassword(password) : undefined
  };

  if (password && password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        appRole: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          include: {
            project: { select: { id: true, title: true, stage: true } }
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: auth.user.id,
        actor: auth.user.email,
        action: "admin.user.updated",
        entityType: "User",
        entityId: user.id,
        detailJson: { email: data.email, appRole: data.appRole, passwordChanged: Boolean(password) }
      }
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "User deletion requires DATABASE_URL." }, { status: 503 });
  }

  if (auth.user.id === params.id) {
    return NextResponse.json({ error: "Admins cannot delete their own active session user." }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });
    await prisma.auditLog.create({
      data: {
        actorUserId: auth.user.id,
        actor: auth.user.email,
        action: "admin.user.deleted",
        entityType: "User",
        entityId: params.id,
        detailJson: {}
      }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalAppRole(value: unknown): AppRole | undefined {
  return value === "admin" || value === "executive" || value === "producer" || value === "department_lead" ? value : undefined;
}
