import { NextResponse } from "next/server";
import type { AssetStatus, AssetType, CommentTargetType, CommentVisibility, ContactRelationshipType, ContactStatus, ContactType, DocumentType, DocumentVersionStatus, Prisma, ProjectStatus, ProjectStage, Prospect, SlateCollectionItemType, SupportingDocumentType, TaskPriority, TaskStatus, TaskTargetType, UserRole } from "@prisma/client";
import { forbidden, hashPassword, isDatabaseConfigured, requireUser, verifyPassword } from "@/lib/auth";
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

    const [projects, projectLeads, documents, versions, supportingDocuments, assets, tasks, contacts, contactRelationships, users, approvals, comments, scriptCollections, scriptCollectionItems, slateCollections, slateCollectionItems] = await Promise.all([
      prisma.project.findMany({ where: projectWhere, orderBy: { updatedAt: "desc" } }),
      prisma.prospect.findMany({ where: { deletedAt: null }, orderBy: [{ promotedProjectId: "asc" }, { updatedAt: "desc" }] }),
      prisma.document.findMany({ where: documentWhere, orderBy: { updatedAt: "desc" } }),
      prisma.documentVersion.findMany({ where: { document: documentWhere }, orderBy: { createdAt: "desc" } }),
      prisma.supportingDocument.findMany({ where: { deletedAt: null, scriptDocument: documentWhere }, orderBy: { createdAt: "desc" } }),
      prisma.asset.findMany({ where: canSeeLibrary ? { deletedAt: null } : { deletedAt: null, projectId: { in: projectIds } }, orderBy: { updatedAt: "desc" } }),
      prisma.task.findMany({ where: canViewAllTasks(auth.user.appRole) ? { deletedAt: null } : { deletedAt: null, assignedToId: auth.user.id }, orderBy: { updatedAt: "desc" } }),
      prisma.contact.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" } }),
      prisma.contactRelationship.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.user.findMany({ orderBy: { name: "asc" } }),
      prisma.hammerApproval.findMany({ where: canSeeLibrary ? undefined : { projectId: { in: projectIds } }, orderBy: { createdAt: "desc" } }),
      prisma.comment.findMany({ where: canSeeLibrary ? undefined : { projectId: { in: projectIds } }, orderBy: { createdAt: "desc" } }),
      prisma.scriptCollection.findMany({
        where: canSeeLibrary ? undefined : { items: { some: { document: documentWhere } } },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.scriptCollectionItem.findMany({
        where: canSeeLibrary ? undefined : { document: documentWhere },
        orderBy: [{ sortOrder: "asc" }, { addedAt: "desc" }]
      }),
      prisma.slateCollection.findMany({
        where: canSeeLibrary ? undefined : {
          items: {
            some: {
              OR: [
                { project: projectWhere },
                { prospectId: { not: null } }
              ]
            }
          }
        },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.slateCollectionItem.findMany({
        where: canSeeLibrary ? undefined : {
          OR: [
            { project: projectWhere },
            { prospectId: { not: null } }
          ]
        },
        orderBy: [{ sortOrder: "asc" }, { addedAt: "desc" }]
      })
    ]);

    return NextResponse.json({
      mode: "database",
      projects: projects.map(toProject),
      projectLeads: projectLeads.map(toProjectLead),
      documents: documents.map(toDocument),
      versions: versions.map(toVersion),
      supportingDocuments: supportingDocuments.map(toSupportingDocument),
      assets: assets.map(toAsset),
      tasks: tasks.map(toTask),
      contacts: contacts.map(toContact),
      contactRelationships: contactRelationships.map(toContactRelationship),
      users: users.map(toUser),
      approvals: approvals.map(toApproval),
      comments: comments.map(toComment),
      scriptCollections: scriptCollections.map(toScriptCollection),
      scriptCollectionItems: scriptCollectionItems.map(toScriptCollectionItem),
      slateCollections: slateCollections.map(toSlateCollection),
      slateCollectionItems: slateCollectionItems.map(toSlateCollectionItem)
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

      case "updateProjectLead":
        if (!canManageLibrary(auth.user.appRole) && !canUpdateProjectLeadBasicFields(body)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ projectLead: toProjectLead(await prisma.prospect.update({
          where: { id: stringField(body.leadId) },
          data: canManageLibrary(auth.user.appRole) ? projectLeadPatch(body) : projectLeadBasicPatch(body)
        })) });

      case "createProjectLead":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ projectLead: toProjectLead(await prisma.prospect.create({
          data: projectLeadCreate(body)
        })) }, { status: 201 });

      case "importProjectLeads": {
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        const leads = Array.isArray(body.leads) ? body.leads as Record<string, unknown>[] : [];
        const existingIds = new Set((await prisma.prospect.findMany({
          select: { id: true, externalId: true }
        })).flatMap((lead) => [lead.id, lead.externalId].filter((value): value is string => Boolean(value))));
        const newLeads = leads
          .map((lead) => projectLeadCreate(lead))
          .filter((lead) => !(lead.id && existingIds.has(lead.id)) && !(lead.externalId && existingIds.has(lead.externalId)));
        if (!newLeads.length) return NextResponse.json({ projectLeads: [], skipped: leads.length });
        const created = await prisma.$transaction(newLeads.map((lead) => prisma.prospect.create({ data: lead })));
        return NextResponse.json({ projectLeads: created.map(toProjectLead), skipped: leads.length - created.length });
      }

      case "promoteProjectLead": {
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        const lead = await prisma.prospect.findUnique({ where: { id: stringField(body.leadId) } });
        if (!lead) return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
        if (lead.promotedProjectId) return NextResponse.json({ project: toProject(await prisma.project.findUniqueOrThrow({ where: { id: lead.promotedProjectId } })), projectLead: toProjectLead(lead) });
        const project = await prisma.project.create({
          data: {
            title: lead.title,
            logline: lead.logline || "Promoted from prospects.",
            type: lead.format || lead.adaptationFormat || "Feature",
            genre: lead.genre || "Unassigned",
            status: "IDEA",
            hammerStage: "DEVELOPMENT",
            ownerId: auth.user.id,
            stage: "DEVELOPMENT",
            auditLogs: { create: audit(auth.user.id, auth.user.email, "prospect.promoted", "Prospect", lead.id, { title: lead.title }) }
          }
        });
        const projectLead = await prisma.prospect.update({ where: { id: lead.id }, data: { promotedProjectId: project.id, nextActionStatus: "Promoted to Development Slate" } });
        return NextResponse.json({ project: toProject(project), projectLead: toProjectLead(projectLead) });
      }

      case "uploadDocumentVersion":
        return NextResponse.json(await uploadDocumentVersion(auth.user.id, body));

      case "updateDocumentStatus":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ version: toVersion(await prisma.documentVersion.update({
          where: { id: stringField(body.versionId) },
          data: { status: scriptStatusField(body.status) }
        })) });

      case "updateDocumentVersionNotes":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ version: toVersion(await prisma.documentVersion.update({
          where: { id: stringField(body.versionId) },
          data: { notes: stringField(body.notes) }
        })) });

      case "createComment":
        return NextResponse.json({ comment: toComment(await prisma.comment.create({
          data: {
            projectId: optionalString(body.projectId),
            targetType: commentTargetTypeField(body.targetType),
            targetId: stringField(body.targetId),
            body: stringField(body.body),
            visibility: commentVisibilityField(body.visibility),
            createdById: auth.user.id
          }
        })) }, { status: 201 });

      case "createScriptCollection":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ scriptCollection: toScriptCollection(await prisma.scriptCollection.create({
          data: {
            name: stringField(body.name) || "Untitled Collection",
            description: optionalString(body.description),
            visibility: commentVisibilityField(body.visibility),
            ownerId: auth.user.id
          }
        })) }, { status: 201 });

      case "addDocumentToCollection": {
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        const collectionId = stringField(body.collectionId);
        const currentCount = await prisma.scriptCollectionItem.count({ where: { collectionId } });
        return NextResponse.json({ scriptCollectionItem: toScriptCollectionItem(await prisma.scriptCollectionItem.upsert({
          where: { collectionId_documentId: { collectionId, documentId: stringField(body.documentId) } },
          update: { notes: body.notes !== undefined ? optionalString(body.notes) : undefined },
          create: {
            collectionId,
            documentId: stringField(body.documentId),
            sortOrder: currentCount + 1,
            notes: optionalString(body.notes)
          }
        })) });
      }

      case "removeDocumentFromCollection":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        await prisma.scriptCollectionItem.delete({ where: { id: stringField(body.collectionItemId) } });
        return NextResponse.json({ ok: true });

      case "createSlateCollection":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ slateCollection: toSlateCollection(await prisma.slateCollection.create({
          data: {
            name: stringField(body.name) || "Untitled Collection",
            description: optionalString(body.description),
            visibility: commentVisibilityField(body.visibility),
            ownerId: auth.user.id
          }
        })) }, { status: 201 });

      case "addSlateItemToCollection": {
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        const collectionId = stringField(body.collectionId);
        const itemType = slateCollectionItemTypeField(body.itemType);
        const itemId = stringField(body.itemId);
        if (!itemId) return NextResponse.json({ error: "Collection item is required." }, { status: 400 });
        const existing = await prisma.slateCollectionItem.findFirst({
          where: itemType === "PROJECT"
            ? { collectionId, itemType, projectId: itemId }
            : { collectionId, itemType, prospectId: itemId }
        });
        if (existing) return NextResponse.json({ slateCollectionItem: toSlateCollectionItem(existing) });
        const currentCount = await prisma.slateCollectionItem.count({ where: { collectionId } });
        return NextResponse.json({ slateCollectionItem: toSlateCollectionItem(await prisma.slateCollectionItem.create({
          data: {
            collectionId,
            itemType,
            projectId: itemType === "PROJECT" ? itemId : undefined,
            prospectId: itemType === "PROSPECT" ? itemId : undefined,
            sortOrder: currentCount + 1,
            notes: optionalString(body.notes)
          }
        })) });
      }

      case "removeSlateItemFromCollection":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        await prisma.slateCollectionItem.delete({ where: { id: stringField(body.collectionItemId) } });
        return NextResponse.json({ ok: true });

      case "assignDocumentToProject":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ document: toDocument(await prisma.document.update({
          where: { id: stringField(body.documentId) },
          data: { projectId: stringField(body.projectId), updatedAt: new Date() }
        })) });

      case "updateDocumentMetadata":
        if (!await canManageDocumentMetadata(auth.user.appRole, auth.user.projectRoles, stringField(body.documentId))) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ document: toDocument(await prisma.document.update({
          where: { id: stringField(body.documentId) },
          data: {
            title: stringField(body.title) || undefined,
            type: body.type ? documentTypeField(body.type) : undefined,
            writerName: body.writerName !== undefined ? optionalString(body.writerName) ?? null : undefined,
            source: body.source !== undefined ? optionalString(body.source) ?? null : undefined,
            updatedAt: new Date()
          }
        })) });

      case "deleteDocument":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
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
            projectId: optionalString(body.projectId),
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

      case "deleteTask":
        if (!canViewAllTasks(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ task: toTask(await prisma.task.update({
          where: { id: stringField(body.taskId) },
          data: { deletedAt: new Date() }
        })) });

      case "deleteProject":
        if (auth.user.appRole !== "admin") return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ project: toProject(await prisma.project.update({
          where: { id: stringField(body.projectId) },
          data: { deletedAt: new Date() }
        })) });

      case "createUser":
        if (auth.user.appRole !== "admin") return NextResponse.json(forbidden(), { status: 403 });
        if (!stringField(body.email) || !stringField(body.name) || stringField(body.password).length < 8) {
          return NextResponse.json({ error: "Name, email, and an 8+ character password are required." }, { status: 400 });
        }
        return NextResponse.json({ user: toUser(await prisma.user.create({
          data: {
            email: stringField(body.email).toLowerCase(),
            name: stringField(body.name) || stringField(body.email),
            passwordHash: hashPassword(stringField(body.password)),
            appRole: appRoleField(body.appRole),
            role: userRoleForAppRole(appRoleField(body.appRole))
          }
        })) }, { status: 201 });

      case "updateUserRole": {
        if (auth.user.appRole !== "admin") return NextResponse.json(forbidden(), { status: 403 });
        const userId = stringField(body.userId);
        if (!userId) return NextResponse.json({ error: "User is required." }, { status: 400 });
        const nextAppRole = appRoleField(body.appRole);
        return NextResponse.json({ user: toUser(await prisma.user.update({
          where: { id: userId },
          data: {
            appRole: nextAppRole,
            role: userRoleForAppRole(nextAppRole)
          }
        })) });
      }

      case "deleteUser":
        if (auth.user.appRole !== "admin") return NextResponse.json(forbidden(), { status: 403 });
        if (stringField(body.userId) === auth.user.id) return NextResponse.json({ error: "Admins cannot delete their own active session user." }, { status: 400 });
        await prisma.user.delete({ where: { id: stringField(body.userId) } });
        return NextResponse.json({ ok: true });

      case "updateAccount": {
        const nextPassword = stringField(body.newPassword);
        const currentPassword = stringField(body.currentPassword);
        const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
        if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
        if (nextPassword) {
          if (nextPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
          if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) return NextResponse.json({ error: "Current password is required to change password." }, { status: 400 });
        }
        return NextResponse.json({ user: toUser(await prisma.user.update({
          where: { id: auth.user.id },
          data: {
            name: stringField(body.name) || user.name,
            email: stringField(body.email) ? stringField(body.email).toLowerCase() : user.email,
            passwordHash: nextPassword ? hashPassword(nextPassword) : undefined
          }
        })) });
      }

      case "createContact":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        if (!stringField(body.name)) return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
        return NextResponse.json({ contact: toContact(await prisma.contact.create({
          data: contactCreateData(body)
        })) }, { status: 201 });

      case "importContacts":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ contacts: (await prisma.$transaction((Array.isArray(body.contacts) ? body.contacts : []).map((item) => {
          const contact = item as Record<string, unknown>;
          return prisma.contact.create({
            data: contactCreateData(contact)
          });
        }))).map(toContact) });

      case "updateContact":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ contact: toContact(await prisma.contact.update({
          where: { id: stringField(body.contactId) },
          data: {
            name: body.name !== undefined ? stringField(body.name) || "Unnamed Contact" : undefined,
            company: body.company !== undefined ? optionalString(body.company) : undefined,
            type: body.type !== undefined ? contactTypeField(body.type) : undefined,
            title: body.title !== undefined ? optionalString(body.title) : undefined,
            email: body.email !== undefined ? optionalString(body.email) : undefined,
            phone: body.phone !== undefined ? optionalString(body.phone) : undefined,
            location: body.location !== undefined ? optionalString(body.location) : undefined,
            website: body.website !== undefined ? optionalString(body.website) : undefined,
            status: body.status ? contactStatusField(body.status) : undefined,
            ownerId: body.ownerId !== undefined ? optionalString(body.ownerId) : undefined,
            tags: body.tags !== undefined ? (Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string") : parseTags(optionalString(body.tags))) : undefined,
            lastContacted: body.lastContacted !== undefined ? dateField(body.lastContacted) : undefined,
            nextFollowUp: body.nextFollowUp !== undefined ? dateField(body.nextFollowUp) : undefined,
            projectIds: body.projectIds !== undefined ? (Array.isArray(body.projectIds) ? body.projectIds.filter((id): id is string => typeof id === "string") : []) : undefined,
            notes: body.notes !== undefined ? optionalString(body.notes) : undefined
          }
        })) });

      case "deleteContact":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ contact: toContact(await prisma.contact.update({
          where: { id: stringField(body.contactId) },
          data: { deletedAt: new Date() }
        })) });

      case "createContactRelationship":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ contactRelationship: toContactRelationship(await prisma.contactRelationship.upsert({
          where: {
            fromContactId_toContactId_relationshipType: {
              fromContactId: stringField(body.fromContactId),
              toContactId: stringField(body.toContactId),
              relationshipType: contactRelationshipTypeField(body.relationshipType)
            }
          },
          update: { notes: body.notes !== undefined ? optionalString(body.notes) : undefined },
          create: {
            fromContactId: stringField(body.fromContactId),
            toContactId: stringField(body.toContactId),
            relationshipType: contactRelationshipTypeField(body.relationshipType),
            notes: optionalString(body.notes)
          }
        })) });

      case "deleteContactRelationship":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        await prisma.contactRelationship.delete({ where: { id: stringField(body.relationshipId) } });
        return NextResponse.json({ ok: true });

      default:
        return NextResponse.json({ error: "Unknown GreenLight action." }, { status: 400 });
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

function toProjectLead(lead: Prospect) {
  return {
    id: lead.id,
    title: lead.title,
    externalId: lead.externalId ?? undefined,
    logline: lead.logline ?? undefined,
    genre: lead.genre ?? undefined,
    lane: lead.lane ?? undefined,
    creator: lead.creator ?? undefined,
    priorityScore: lead.priorityScore ?? undefined,
    subgenreTags: lead.subgenreTags ?? undefined,
    urgencyLabel: lead.urgencyLabel ?? undefined,
    discoveryStage: lead.discoveryStage ?? undefined,
    countryLanguage: lead.countryLanguage ?? undefined,
    platformSource: lead.platformSource ?? undefined,
    whyItMatters: lead.whyItMatters ?? undefined,
    signalProof: lead.signalProof ?? undefined,
    sourceLink: lead.sourceLink ?? undefined,
    rightsStatus: lead.rightsStatus ?? undefined,
    rightsHolder: lead.rightsHolder ?? undefined,
    contactRep: lead.contactRep ?? undefined,
    adaptationFormat: lead.adaptationFormat ?? undefined,
    comps: lead.comps ?? undefined,
    heatScore: lead.heatScore ?? undefined,
    conceptScore: lead.conceptScore ?? undefined,
    adaptabilityScore: lead.adaptabilityScore ?? undefined,
    rightsOpportunityScore: lead.rightsOpportunityScore ?? undefined,
    studioFitScore: lead.studioFitScore ?? undefined,
    nextActionStatus: lead.nextActionStatus ?? undefined,
    owner: lead.owner ?? undefined,
    nextStep: lead.nextStep ?? undefined,
    lastUpdated: lead.lastUpdated ?? undefined,
    notes: lead.notes ?? undefined,
    projectCover: lead.projectCover ?? undefined,
    searchKeywords: lead.searchKeywords ?? undefined,
    originalReleaseDate: lead.originalReleaseDate ?? undefined,
    myPicks: lead.myPicks ?? undefined,
    actionItems: lead.actionItems ?? undefined,
    country: lead.country ?? undefined,
    votes: lead.votes ?? undefined,
    yearWritten: lead.yearWritten ?? undefined,
    scriptStatus: lead.scriptStatus ?? undefined,
    format: lead.format ?? undefined,
    scriptPdf: lead.scriptPdf ?? undefined,
    promotedProjectId: lead.promotedProjectId ?? undefined
  };
}

function toUser(user: { id: string; email: string; name: string; avatarUrl: string | null; googleId: string | null; role: UserRole; appRole?: string }) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl ?? undefined, googleId: user.googleId ?? "", role: hammerRoleForAppRole(user.appRole) ?? user.role };
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

function toTask(task: { id: string; projectId: string | null; title: string; description: string | null; assignedToId: string | null; createdById: string | null; dueDate: Date | null; priority: TaskPriority; status: TaskStatus; targetType: TaskTargetType | null; targetId: string | null }) {
  return { id: task.id, projectId: task.projectId ?? "", title: task.title, description: task.description ?? "", assignedToId: task.assignedToId ?? "", createdById: task.createdById ?? "", dueDate: task.dueDate ? dateString(task.dueDate) : "", priority: task.priority, status: task.status, targetType: task.targetType ?? "GENERAL", targetId: task.targetId ?? task.projectId ?? "" };
}

function toContact(contact: { id: string; name: string; company: string | null; type: ContactType; title: string | null; email: string | null; phone: string | null; location: string | null; website: string | null; status: ContactStatus; ownerId: string | null; tags: string[]; lastContacted: Date | null; nextFollowUp: Date | null; projectIds: string[]; notes: string | null }) {
  return {
    id: contact.id,
    name: contact.name,
    company: contact.company ?? "",
    type: contact.type,
    title: contact.title ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    location: contact.location ?? "",
    website: contact.website ?? undefined,
    status: contact.status,
    ownerId: contact.ownerId ?? undefined,
    tags: contact.tags,
    lastContacted: contact.lastContacted ? dateString(contact.lastContacted) : undefined,
    nextFollowUp: contact.nextFollowUp ? dateString(contact.nextFollowUp) : undefined,
    projectIds: contact.projectIds,
    notes: contact.notes ?? ""
  };
}

function toContactRelationship(relationship: { id: string; fromContactId: string; toContactId: string; relationshipType: ContactRelationshipType; notes: string | null; createdAt: Date }) {
  return { id: relationship.id, fromContactId: relationship.fromContactId, toContactId: relationship.toContactId, relationshipType: relationship.relationshipType, notes: relationship.notes ?? undefined, createdAt: dateString(relationship.createdAt) };
}

function toApproval(approval: { id: string; projectId: string | null; targetType: string; targetId: string; requestedById: string | null; reviewerId: string | null; status: string; decisionNotes: string | null; createdAt: Date; decidedAt: Date | null }) {
  return { id: approval.id, projectId: approval.projectId ?? "", targetType: approval.targetType, targetId: approval.targetId, requestedById: approval.requestedById ?? "", reviewerId: approval.reviewerId ?? "", status: approval.status, decisionNotes: approval.decisionNotes ?? undefined, createdAt: dateString(approval.createdAt), decidedAt: approval.decidedAt ? dateString(approval.decidedAt) : undefined };
}

function toComment(comment: { id: string; targetType: CommentTargetType; targetId: string; body: string; visibility: CommentVisibility; status: string; createdById: string | null; createdAt: Date }) {
  return { id: comment.id, targetType: comment.targetType, targetId: comment.targetId, body: comment.body, visibility: comment.visibility, status: comment.status, createdById: comment.createdById ?? "", createdAt: dateString(comment.createdAt) };
}

function toScriptCollection(collection: { id: string; name: string; description: string | null; ownerId: string | null; status: string; visibility: CommentVisibility; createdAt: Date; updatedAt: Date }) {
  return { id: collection.id, name: collection.name, description: collection.description ?? undefined, ownerId: collection.ownerId ?? undefined, status: collection.status, visibility: collection.visibility, createdAt: dateString(collection.createdAt), updatedAt: dateString(collection.updatedAt) };
}

function toScriptCollectionItem(item: { id: string; collectionId: string; documentId: string; sortOrder: number; notes: string | null; addedAt: Date }) {
  return { id: item.id, collectionId: item.collectionId, documentId: item.documentId, sortOrder: item.sortOrder, notes: item.notes ?? undefined, addedAt: dateString(item.addedAt) };
}

function toSlateCollection(collection: { id: string; name: string; description: string | null; ownerId: string | null; status: string; visibility: CommentVisibility; createdAt: Date; updatedAt: Date }) {
  return { id: collection.id, name: collection.name, description: collection.description ?? undefined, ownerId: collection.ownerId ?? undefined, status: collection.status, visibility: collection.visibility, createdAt: dateString(collection.createdAt), updatedAt: dateString(collection.updatedAt) };
}

function toSlateCollectionItem(item: { id: string; collectionId: string; itemType: SlateCollectionItemType; projectId: string | null; prospectId: string | null; sortOrder: number; notes: string | null; addedAt: Date }) {
  return { id: item.id, collectionId: item.collectionId, itemType: item.itemType, projectId: item.projectId ?? undefined, prospectId: item.prospectId ?? undefined, sortOrder: item.sortOrder, notes: item.notes ?? undefined, addedAt: dateString(item.addedAt) };
}

function canManageLibrary(role: string) {
  const normalizedRole = role.toLowerCase();
  return normalizedRole === "admin" || normalizedRole === "producer" || normalizedRole === "executive" || normalizedRole === "exec";
}

async function canManageDocumentMetadata(role: string, projectRoles: Record<string, string>, documentId: string) {
  if (canManageLibrary(role)) return true;
  const document = await prisma.document.findUnique({ where: { id: documentId }, select: { projectId: true, deletedAt: true } });
  if (!document || document.deletedAt || !document.projectId) return false;
  return Boolean(projectRoles[document.projectId]);
}

function canUpdateProjectLeadBasicFields(body: ActionBody) {
  const allowed = new Set(["action", "leadId", "title", "creator", "urgencyLabel", "genre", "priorityScore"]);
  return Object.keys(body).every((key) => allowed.has(key));
}

function canViewAllProjects(role: string) {
  const normalizedRole = role.toLowerCase();
  return normalizedRole === "admin" || normalizedRole === "executive" || normalizedRole === "exec" || normalizedRole === "producer";
}

function canViewAllTasks(role: string) {
  const normalizedRole = role.toLowerCase();
  return normalizedRole === "admin" || normalizedRole === "producer" || normalizedRole === "executive" || normalizedRole === "exec";
}

function canManageProject(role: string, projectRoles: Record<string, string>, projectId: string) {
  const normalizedRole = role.toLowerCase();
  return normalizedRole === "admin" || projectRoles[projectId] === "owner" || projectRoles[projectId] === "producer";
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

function contactRelationshipTypeField(value: unknown): ContactRelationshipType {
  const relationshipType = stringField(value).toUpperCase();
  if (["AGENT", "MANAGER", "REPRESENTS", "WORKS_WITH", "ASSISTANT", "LEGAL_REP", "REFERRED_BY", "OTHER"].includes(relationshipType)) return relationshipType as ContactRelationshipType;
  return "OTHER";
}

function commentTargetTypeField(value: unknown): CommentTargetType {
  const targetType = stringField(value).toUpperCase();
  if (["PROJECT", "DOCUMENT", "DOCUMENT_VERSION", "SCENE", "ENTITY", "ASSET", "TASK", "APPROVAL"].includes(targetType)) return targetType as CommentTargetType;
  return "DOCUMENT_VERSION";
}

function commentVisibilityField(value: unknown): CommentVisibility {
  const visibility = stringField(value).toUpperCase();
  if (visibility === "INTERNAL" || visibility === "PROJECT_TEAM" || visibility === "EXECUTIVE_ONLY") return visibility;
  return "PROJECT_TEAM";
}

function numberField(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function optionalNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function projectLeadPatch(body: ActionBody): Prisma.ProspectUpdateInput {
  return {
    title: body.title !== undefined ? stringField(body.title) || "Untitled Slate Item" : undefined,
    logline: body.logline !== undefined ? optionalString(body.logline) : undefined,
    genre: body.genre !== undefined ? optionalString(body.genre) : undefined,
    lane: body.lane !== undefined ? optionalString(body.lane) : undefined,
    creator: body.creator !== undefined ? optionalString(body.creator) : undefined,
    priorityScore: body.priorityScore !== undefined ? optionalNumber(body.priorityScore) : undefined,
    urgencyLabel: body.urgencyLabel !== undefined ? optionalString(body.urgencyLabel) : undefined,
    rightsStatus: body.rightsStatus !== undefined ? optionalString(body.rightsStatus) : undefined,
    contactRep: body.contactRep !== undefined ? optionalString(body.contactRep) : undefined,
    nextActionStatus: body.nextActionStatus !== undefined ? optionalString(body.nextActionStatus) : undefined,
    owner: body.owner !== undefined ? optionalString(body.owner) : undefined,
    nextStep: body.nextStep !== undefined ? optionalString(body.nextStep) : undefined,
    lastUpdated: body.lastUpdated !== undefined ? optionalString(body.lastUpdated) : undefined,
    notes: body.notes !== undefined ? optionalString(body.notes) : undefined,
    myPicks: body.myPicks !== undefined ? optionalString(body.myPicks) : undefined,
    actionItems: body.actionItems !== undefined ? optionalString(body.actionItems) : undefined,
    scriptStatus: body.scriptStatus !== undefined ? optionalString(body.scriptStatus) : undefined,
    format: body.format !== undefined ? optionalString(body.format) : undefined
  };
}

function projectLeadBasicPatch(body: ActionBody): Prisma.ProspectUpdateInput {
  return {
    title: body.title !== undefined ? stringField(body.title) || "Untitled Slate Item" : undefined,
    creator: body.creator !== undefined ? optionalString(body.creator) : undefined,
    urgencyLabel: body.urgencyLabel !== undefined ? optionalString(body.urgencyLabel) : undefined,
    genre: body.genre !== undefined ? optionalString(body.genre) : undefined,
    priorityScore: body.priorityScore !== undefined ? optionalNumber(body.priorityScore) : undefined
  };
}

function projectLeadCreate(body: Record<string, unknown>): Prisma.ProspectCreateInput {
  const externalId = optionalString(body.externalId);
  return {
    id: optionalString(body.id) ?? externalId ?? undefined,
    title: stringField(body.title) || "Untitled Slate Item",
    externalId,
    logline: optionalString(body.logline),
    genre: optionalString(body.genre),
    lane: optionalString(body.lane),
    creator: optionalString(body.creator),
    priorityScore: optionalNumber(body.priorityScore),
    subgenreTags: optionalString(body.subgenreTags),
    urgencyLabel: optionalString(body.urgencyLabel),
    discoveryStage: optionalString(body.discoveryStage),
    countryLanguage: optionalString(body.countryLanguage),
    platformSource: optionalString(body.platformSource),
    whyItMatters: optionalString(body.whyItMatters),
    signalProof: optionalString(body.signalProof),
    sourceLink: optionalString(body.sourceLink),
    rightsStatus: optionalString(body.rightsStatus),
    rightsHolder: optionalString(body.rightsHolder),
    contactRep: optionalString(body.contactRep),
    adaptationFormat: optionalString(body.adaptationFormat),
    comps: optionalString(body.comps),
    heatScore: optionalNumber(body.heatScore),
    conceptScore: optionalNumber(body.conceptScore),
    adaptabilityScore: optionalNumber(body.adaptabilityScore),
    rightsOpportunityScore: optionalNumber(body.rightsOpportunityScore),
    studioFitScore: optionalNumber(body.studioFitScore),
    nextActionStatus: optionalString(body.nextActionStatus),
    owner: optionalString(body.owner),
    nextStep: optionalString(body.nextStep),
    lastUpdated: optionalString(body.lastUpdated),
    notes: optionalString(body.notes),
    projectCover: optionalString(body.projectCover),
    searchKeywords: optionalString(body.searchKeywords),
    originalReleaseDate: optionalString(body.originalReleaseDate),
    myPicks: optionalString(body.myPicks),
    actionItems: optionalString(body.actionItems),
    country: optionalString(body.country),
    votes: optionalNumber(body.votes),
    yearWritten: optionalString(body.yearWritten),
    scriptStatus: optionalString(body.scriptStatus),
    format: optionalString(body.format),
    scriptPdf: optionalString(body.scriptPdf)
  };
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
const taskTargets: TaskTargetType[] = ["GENERAL", "PROJECT", "PROJECT_LEAD", "DOCUMENT", "DOCUMENT_VERSION", "SCENE", "ENTITY", "ASSET", "APPROVAL", "CONTACT"];

function slateCollectionItemTypeField(value: unknown): SlateCollectionItemType {
  return slateCollectionItemTypes.includes(value as SlateCollectionItemType) ? value as SlateCollectionItemType : "PROJECT";
}
const slateCollectionItemTypes: SlateCollectionItemType[] = ["PROJECT", "PROSPECT"];

function appRoleField(value: unknown) {
  return value === "admin" || value === "executive" || value === "producer" || value === "department_lead" ? value : "producer";
}

function userRoleForAppRole(value: string): UserRole {
  if (value === "admin") return "ADMIN";
  if (value === "executive") return "EXECUTIVE";
  if (value === "department_lead") return "DEVELOPMENT";
  return "PRODUCER";
}

function hammerRoleForAppRole(value?: string) {
  if (value === "admin") return "ADMIN";
  if (value === "executive") return "EXECUTIVE";
  if (value === "producer") return "PRODUCER";
  if (value === "department_lead") return "DEVELOPMENT";
  return undefined;
}

function contactCreateData(contact: Record<string, unknown>): Prisma.ContactCreateInput {
  return {
    name: stringField(contact.name) || "Unnamed Contact",
    company: optionalString(contact.company),
    type: contactTypeField(contact.type),
    title: optionalString(contact.title),
    email: optionalString(contact.email),
    phone: optionalString(contact.phone),
    location: optionalString(contact.location),
    website: optionalString(contact.website),
    status: contactStatusField(contact.status),
    ownerId: optionalString(contact.ownerId),
    tags: Array.isArray(contact.tags) ? contact.tags.filter((tag): tag is string => typeof tag === "string") : parseTags(optionalString(contact.tags)),
    lastContacted: dateField(contact.lastContacted),
    nextFollowUp: dateField(contact.nextFollowUp),
    notes: optionalString(contact.notes),
    projectIds: Array.isArray(contact.projectIds) ? contact.projectIds.filter((id): id is string => typeof id === "string") : []
  };
}

function contactTypeField(value: unknown): ContactType {
  return contactTypes.includes(value as ContactType) ? value as ContactType : "OTHER";
}
const contactTypes: ContactType[] = ["WRITER", "PRODUCER", "ARTIST", "EXECUTIVE", "AGENCY", "MANAGEMENT", "LEGAL", "VENDOR", "OTHER"];

function contactStatusField(value: unknown): ContactStatus {
  return contactStatuses.includes(value as ContactStatus) ? value as ContactStatus : "ACTIVE";
}
const contactStatuses: ContactStatus[] = ["NEW", "ACTIVE", "FOLLOW_UP", "WAITING", "DO_NOT_CONTACT", "ARCHIVED"];

function parseTags(value?: string) {
  return value ? value.split(/[;,]/).map((tag) => tag.trim()).filter(Boolean) : [];
}
