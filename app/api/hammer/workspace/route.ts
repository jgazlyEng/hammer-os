import { NextResponse } from "next/server";
import type { AssetStatus, AssetType, ContactType, DocumentType, DocumentVersionStatus, Prisma, ProjectStatus, ProjectStage, SupportingDocumentType, TaskPriority, TaskStatus, TaskTargetType, UserRole } from "@prisma/client";
import { forbidden, isDatabaseConfigured, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type ActionBody = Record<string, unknown> & { action?: string };

export async function GET(request: Request) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDatabaseConfigured()) return NextResponse.json({ mode: "demo" });

  try {
    const canSeeLibrary = canManageLibrary(auth.user.appRole);
    const projectIds = Object.keys(auth.user.projectRoles);
    const projectWhere = canViewAllProjects(auth.user.appRole) ? { deletedAt: null } : { deletedAt: null, memberships: { some: { userId: auth.user.id } } };
    const documentWhere = canSeeLibrary ? { deletedAt: null } : { deletedAt: null, projectId: { in: projectIds } };

    const [projects, documents, versions, supportingDocuments, assets, tasks, contacts, users, approvals] = await Promise.all([
      prisma.project.findMany({ where: projectWhere, orderBy: { updatedAt: "desc" } }),
      prisma.document.findMany({ where: documentWhere, orderBy: { updatedAt: "desc" } }),
      prisma.documentVersion.findMany({ where: { document: documentWhere }, orderBy: { createdAt: "desc" } }),
      prisma.supportingDocument.findMany({ where: { deletedAt: null, scriptDocument: documentWhere }, orderBy: { createdAt: "desc" } }),
      prisma.asset.findMany({ where: canSeeLibrary ? { deletedAt: null } : { deletedAt: null, projectId: { in: projectIds } }, orderBy: { updatedAt: "desc" } }),
      prisma.task.findMany({ where: canViewAllTasks(auth.user.appRole) ? { deletedAt: null } : { deletedAt: null, assignedToId: auth.user.id }, orderBy: { updatedAt: "desc" } }),
      prisma.contact.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" } }),
      prisma.user.findMany({ orderBy: { name: "asc" } }),
      prisma.hammerApproval.findMany({ where: canSeeLibrary ? undefined : { projectId: { in: projectIds } }, orderBy: { createdAt: "desc" } })
    ]);

    return NextResponse.json({
      mode: "database",
      projects: projects.map(toProject),
      documents: documents.map(toDocument),
      versions: versions.map(toVersion),
      supportingDocuments: supportingDocuments.map(toSupportingDocument),
      assets: assets.map(toAsset),
      tasks: tasks.map(toTask),
      contacts: contacts.map(toContact),
      users: users.map(toUser),
      approvals: approvals.map(toApproval)
    });
  } catch (error) {
    return NextResponse.json({ error: "Database unavailable.", detail: error instanceof Error ? error.message : undefined }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database mode is not configured." }, { status: 503 });

  const body = await request.json() as ActionBody;

  try {
    switch (body.action) {
      case "createProject":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ project: toProject(await prisma.project.create({
          data: {
            title: stringField(body.title) || "Untitled Studio Project",
            logline: stringField(body.logline) || "New internal development project.",
            type: stringField(body.type) || "Feature",
            genre: stringField(body.genre) || "Drama",
            status: projectStatusField(body.status),
            hammerStage: projectStageField(body.stage),
            ownerId: optionalString(body.ownerId) ?? auth.user.id,
            stage: projectStageField(body.stage),
            auditLogs: { create: audit(auth.user.id, auth.user.email, "project.created", "Project", undefined, { title: stringField(body.title) }) }
          }
        })) });

      case "updateProjectStatus":
        if (!canManageProject(auth.user.appRole, auth.user.projectRoles, stringField(body.projectId))) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ project: toProject(await prisma.project.update({
          where: { id: stringField(body.projectId) },
          data: { status: projectStatusField(body.status), auditLogs: { create: audit(auth.user.id, auth.user.email, "project.status_changed", "Project", stringField(body.projectId), { status: body.status }) } }
        })) });

      case "uploadDocumentVersion":
        return NextResponse.json(await uploadDocumentVersion(auth.user.id, body));

      case "updateDocumentStatus":
        return NextResponse.json({ version: toVersion(await prisma.documentVersion.update({
          where: { id: stringField(body.versionId) },
          data: { status: scriptStatusField(body.status) }
        })) });

      case "assignDocumentToProject":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ document: toDocument(await prisma.document.update({
          where: { id: stringField(body.documentId) },
          data: { projectId: stringField(body.projectId), updatedAt: new Date() }
        })) });

      case "deleteDocument":
        return NextResponse.json({ document: toDocument(await prisma.document.update({
          where: { id: stringField(body.documentId) },
          data: { deletedAt: new Date() }
        })) });

      case "uploadSupportingDocument":
        return NextResponse.json({ supportingDocument: toSupportingDocument(await prisma.supportingDocument.create({
          data: {
            scriptDocumentId: stringField(body.scriptDocumentId),
            projectId: optionalString(body.projectId),
            title: stringField(body.title) || stringField(body.fileName) || "Supporting Document",
            type: supportingTypeField(body.type),
            notes: optionalString(body.notes),
            fileName: stringField(body.fileName),
            fileType: stringField(body.fileType) || "application/octet-stream",
            fileSize: numberField(body.fileSize),
            storagePath: stringField(body.storagePath),
            extractedText: optionalString(body.extractedText),
            uploadedById: auth.user.id
          }
        })) });

      case "deleteSupportingDocument":
        return NextResponse.json({ supportingDocument: toSupportingDocument(await prisma.supportingDocument.update({
          where: { id: stringField(body.documentId) },
          data: { deletedAt: new Date() }
        })) });

      case "uploadReferenceImage":
        return NextResponse.json({ asset: toAsset(await prisma.asset.create({
          data: {
            projectId: stringField(body.projectId),
            title: stringField(body.title) || stringField(body.fileName) || "Reference Image",
            description: optionalString(body.description),
            assetType: assetTypeField(body.category),
            fileName: stringField(body.fileName),
            fileType: stringField(body.fileType) || "image/*",
            fileSize: numberField(body.fileSize),
            storagePath: stringField(body.storagePath),
            dataUrl: optionalString(body.dataUrl),
            status: "UPLOADED",
            uploadedById: auth.user.id
          }
        })) });

      case "createTask":
        return NextResponse.json({ task: toTask(await prisma.task.create({
          data: {
            projectId: stringField(body.projectId),
            title: stringField(body.title) || "Untitled assignment",
            description: optionalString(body.description),
            assignedToId: optionalString(body.assignedToId),
            createdById: auth.user.id,
            dueDate: dateField(body.dueDate),
            priority: priorityField(body.priority),
            status: taskStatusField(body.status),
            targetType: taskTargetField(body.targetType),
            targetId: optionalString(body.targetId)
          }
        })) });

      case "updateTask":
        return NextResponse.json({ task: toTask(await prisma.task.update({
          where: { id: stringField(body.taskId) },
          data: {
            priority: body.priority ? priorityField(body.priority) : undefined,
            status: body.status ? taskStatusField(body.status) : undefined
          }
        })) });

      case "importContacts":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ contacts: (await prisma.$transaction((Array.isArray(body.contacts) ? body.contacts : []).map((item) => {
          const contact = item as Record<string, unknown>;
          return prisma.contact.create({
            data: {
              name: stringField(contact.name) || "Unnamed Contact",
              company: optionalString(contact.company),
              type: contactTypeField(contact.type),
              title: optionalString(contact.title),
              email: optionalString(contact.email),
              phone: optionalString(contact.phone),
              location: optionalString(contact.location),
              notes: optionalString(contact.notes),
              projectIds: Array.isArray(contact.projectIds) ? contact.projectIds.filter((id): id is string => typeof id === "string") : []
            }
          });
        }))).map(toContact) });

      default:
        return NextResponse.json({ error: "Unknown Hammer OS action." }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Database action failed.", detail: error instanceof Error ? error.message : undefined }, { status: 500 });
  }
}

async function uploadDocumentVersion(userId: string, body: ActionBody) {
  const documentId = stringField(body.documentId);
  const now = new Date();
  const document = documentId
    ? await prisma.document.findUnique({ where: { id: documentId }, include: { versions: true } })
    : await prisma.document.create({
        data: {
          projectId: optionalString(body.projectId),
          title: stringField(body.title) || stringField(body.fileName) || "Untitled Document",
          type: documentTypeField(body.type),
          writerName: optionalString(body.writerName),
          source: optionalString(body.source),
          submittedAt: optionalString(body.projectId) ? undefined : now,
          createdById: userId
        },
        include: { versions: true }
      });
  if (!document) throw new Error("Document not found.");
  const nextVersionNumber = document.versions.length ? Math.max(...document.versions.map((version) => version.versionNumber)) + 1 : 1;
  const version = await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      versionNumber: nextVersionNumber,
      status: scriptStatusField(body.status),
      fileName: stringField(body.fileName),
      fileType: stringField(body.fileType) || "application/octet-stream",
      fileSize: numberField(body.fileSize),
      storagePath: stringField(body.storagePath),
      extractedText: optionalString(body.extractedText),
      uploadedById: userId,
      notes: optionalString(body.notes)
    }
  });
  const updatedDocument = await prisma.document.update({
    where: { id: document.id },
    data: {
      currentVersionId: version.id,
      title: stringField(body.title) || document.title,
      type: documentTypeField(body.type),
      writerName: optionalString(body.writerName) ?? document.writerName,
      updatedAt: now
    }
  });
  return { document: toDocument(updatedDocument), version: toVersion(version) };
}

function toProject(project: { id: string; title: string; logline: string | null; type: string | null; genre: string | null; status: ProjectStatus; hammerStage: ProjectStage; ownerId: string | null; updatedAt: Date }) {
  return { id: project.id, title: project.title, logline: project.logline ?? "", type: project.type ?? "Feature", genre: project.genre ?? "", status: project.status, stage: project.hammerStage, ownerId: project.ownerId ?? "", updatedAt: dateString(project.updatedAt) };
}

function toUser(user: { id: string; email: string; name: string; avatarUrl: string | null; googleId: string | null; role: UserRole }) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl ?? undefined, googleId: user.googleId ?? "", role: user.role };
}

function toDocument(document: { id: string; projectId: string | null; title: string; type: DocumentType; currentVersionId: string | null; createdById: string | null; updatedAt: Date; writerName: string | null; source: string | null; contactId: string | null; submittedAt: Date | null }) {
  return { id: document.id, projectId: document.projectId ?? undefined, title: document.title, type: document.type, currentVersionId: document.currentVersionId ?? "", createdById: document.createdById ?? "", updatedAt: dateString(document.updatedAt), writerName: document.writerName ?? undefined, source: document.source ?? undefined, contactId: document.contactId ?? undefined, submittedAt: document.submittedAt ? dateString(document.submittedAt) : undefined };
}

function toVersion(version: { id: string; documentId: string; versionNumber: number; status: DocumentVersionStatus; fileName: string; fileType: string; fileSize: number; storagePath: string; uploadedById: string | null; createdAt: Date; notes: string | null; extractedText: string | null }) {
  return { id: version.id, documentId: version.documentId, versionNumber: version.versionNumber, status: version.status, fileName: version.fileName, fileType: version.fileType, fileSize: version.fileSize, storagePath: version.storagePath, uploadedById: version.uploadedById ?? "", createdAt: dateString(version.createdAt), notes: version.notes ?? "", extractedText: version.extractedText ?? "" };
}

function toSupportingDocument(document: { id: string; scriptDocumentId: string; title: string; type: SupportingDocumentType; notes: string | null; fileName: string; fileType: string; fileSize: number; storagePath: string; extractedText: string | null; uploadedById: string | null; createdAt: Date }) {
  return { id: document.id, scriptDocumentId: document.scriptDocumentId, title: document.title, type: document.type, notes: document.notes ?? undefined, fileName: document.fileName, fileType: document.fileType, fileSize: document.fileSize, storagePath: document.storagePath, extractedText: document.extractedText ?? "", uploadedById: document.uploadedById ?? "", uploadedAt: dateString(document.createdAt) };
}

function toAsset(asset: { id: string; projectId: string; title: string; description: string | null; assetType: AssetType; fileName: string; fileType: string; fileSize: number; storagePath: string; thumbnailPath: string | null; status: AssetStatus; uploadedById: string | null; dataUrl?: string | null }) {
  return { id: asset.id, projectId: asset.projectId, title: asset.title, description: asset.description ?? "", assetType: asset.assetType, fileName: asset.fileName, fileType: asset.fileType, fileSize: asset.fileSize, storagePath: asset.storagePath, thumbnailPath: asset.thumbnailPath ?? undefined, status: asset.status, uploadedById: asset.uploadedById ?? "", imageUrl: asset.dataUrl ?? undefined };
}

function toTask(task: { id: string; projectId: string; title: string; description: string | null; assignedToId: string | null; createdById: string | null; dueDate: Date | null; priority: TaskPriority; status: TaskStatus; targetType: TaskTargetType | null; targetId: string | null }) {
  return { id: task.id, projectId: task.projectId, title: task.title, description: task.description ?? "", assignedToId: task.assignedToId ?? "", createdById: task.createdById ?? "", dueDate: task.dueDate ? dateString(task.dueDate) : "", priority: task.priority, status: task.status, targetType: task.targetType ?? "PROJECT", targetId: task.targetId ?? task.projectId };
}

function toContact(contact: { id: string; name: string; company: string | null; type: ContactType; title: string | null; email: string | null; phone: string | null; location: string | null; projectIds: string[]; notes: string | null }) {
  return { id: contact.id, name: contact.name, company: contact.company ?? "", type: contact.type, title: contact.title ?? "", email: contact.email ?? "", phone: contact.phone ?? "", location: contact.location ?? "", projectIds: contact.projectIds, notes: contact.notes ?? "" };
}

function toApproval(approval: { id: string; projectId: string | null; targetType: string; targetId: string; requestedById: string | null; reviewerId: string | null; status: string; decisionNotes: string | null; createdAt: Date; decidedAt: Date | null }) {
  return { id: approval.id, projectId: approval.projectId ?? "", targetType: approval.targetType, targetId: approval.targetId, requestedById: approval.requestedById ?? "", reviewerId: approval.reviewerId ?? "", status: approval.status, decisionNotes: approval.decisionNotes ?? undefined, createdAt: dateString(approval.createdAt), decidedAt: approval.decidedAt ? dateString(approval.decidedAt) : undefined };
}

function canManageLibrary(role: string) {
  return role === "admin" || role === "producer" || role === "executive";
}

function canViewAllProjects(role: string) {
  return role === "admin" || role === "executive";
}

function canViewAllTasks(role: string) {
  return role === "admin" || role === "producer" || role === "executive";
}

function canManageProject(role: string, projectRoles: Record<string, string>, projectId: string) {
  return role === "admin" || projectRoles[projectId] === "owner" || projectRoles[projectId] === "producer";
}

function audit(actorUserId: string, actor: string, action: string, entityType: string, entityId?: string, detailJson?: unknown) {
  return { actorUserId, actor, action, entityType, entityId, detailJson: detailJson as Prisma.InputJsonValue };
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  const string = stringField(value);
  return string || undefined;
}

function numberField(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function dateField(value: unknown) {
  const string = stringField(value);
  return string ? new Date(`${string}T00:00:00.000Z`) : undefined;
}

function projectStatusField(value: unknown): ProjectStatus {
  return projectStatuses.includes(value as ProjectStatus) ? value as ProjectStatus : "IDEA";
}
const projectStatuses: ProjectStatus[] = ["IDEA", "SUBMISSION", "TREATMENT", "SCRIPT", "REWRITE", "VISUAL_DEVELOPMENT", "LOOKBOOK", "PACKAGING", "GREENLIGHT_REVIEW", "ON_HOLD", "PASSED", "ARCHIVED"];

function projectStageField(value: unknown): ProjectStage {
  return projectStages.includes(value as ProjectStage) ? value as ProjectStage : "DEVELOPMENT";
}
const projectStages: ProjectStage[] = ["DEVELOPMENT", "SCRIPT", "TREATMENT", "VISDEV", "LOOKBOOK", "PACKAGING", "GREENLIGHT"];

function documentTypeField(value: unknown): DocumentType {
  return documentTypes.includes(value as DocumentType) ? value as DocumentType : "SCRIPT";
}
const documentTypes: DocumentType[] = ["SCRIPT", "TREATMENT", "OUTLINE", "NOTES", "COVERAGE", "BUSINESS_DOCUMENT"];

function scriptStatusField(value: unknown): DocumentVersionStatus {
  return scriptStatuses.includes(value as DocumentVersionStatus) ? value as DocumentVersionStatus : "DRAFT";
}
const scriptStatuses: DocumentVersionStatus[] = ["RECEIVED", "LOGGED", "READING", "COVERAGE_REQUESTED", "COVERAGE_COMPLETE", "CONSIDER", "PASS", "DEVELOPMENT", "PROJECT_LINKED", "DRAFT", "OUTLINE", "IN_PROGRESS", "INTERNAL_REVIEW", "NOTES_SENT", "REVISION_REQUESTED", "APPROVED", "LOCKED", "ARCHIVED"];

function supportingTypeField(value: unknown): SupportingDocumentType {
  return supportingTypes.includes(value as SupportingDocumentType) ? value as SupportingDocumentType : "CONTEXT";
}
const supportingTypes: SupportingDocumentType[] = ["CONTEXT", "COVERAGE", "NOTES", "EMAIL", "WRITER_MATERIAL", "OTHER"];

function assetTypeField(value: unknown): AssetType {
  return assetTypes.includes(value as AssetType) ? value as AssetType : "OTHER";
}
const assetTypes: AssetType[] = ["CHARACTER_REFERENCE", "ENVIRONMENT_REFERENCE", "PROP_REFERENCE", "MOOD_IMAGE", "KEYFRAME", "LOOKBOOK_PAGE", "STORYBOARD", "ANIMATIC", "OTHER"];

function priorityField(value: unknown): TaskPriority {
  return priorities.includes(value as TaskPriority) ? value as TaskPriority : "MEDIUM";
}
const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function taskStatusField(value: unknown): TaskStatus {
  return taskStatuses.includes(value as TaskStatus) ? value as TaskStatus : "TODO";
}
const taskStatuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "ON_HOLD", "BLOCKED", "REVIEW", "DONE", "ARCHIVED"];

function taskTargetField(value: unknown): TaskTargetType {
  return taskTargets.includes(value as TaskTargetType) ? value as TaskTargetType : "PROJECT";
}
const taskTargets: TaskTargetType[] = ["PROJECT", "DOCUMENT", "DOCUMENT_VERSION", "SCENE", "ENTITY", "ASSET", "APPROVAL"];

function contactTypeField(value: unknown): ContactType {
  return contactTypes.includes(value as ContactType) ? value as ContactType : "OTHER";
}
const contactTypes: ContactType[] = ["WRITER", "PRODUCER", "ARTIST", "EXECUTIVE", "AGENCY", "MANAGEMENT", "LEGAL", "VENDOR", "OTHER"];
