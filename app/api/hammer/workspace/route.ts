import { NextResponse } from "next/server";
import type { AssetStatus, AssetType, CommentTargetType, CommentVisibility, ContactRelationshipType, ContactStatus, ContactType, DocumentType, DocumentVersionStatus, OutreachEngagementType, Prisma, ProjectStatus, ProjectStage, Prospect, SlateCollectionItemType, SupportingDocumentType, TaskPriority, TaskStatus, TaskTargetType, UserRole } from "@prisma/client";
import { forbidden, hashPassword, isDatabaseConfigured, requireUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateLocalScriptCoverage, normalizeSummary } from "@/lib/script-coverage";

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
    const prospectWhere = canSeeLibrary ? { deletedAt: null } : { deletedAt: null, id: "__no_shared_prospects__" };
    const contactWhere = canSeeLibrary ? { deletedAt: null } : { deletedAt: null, id: "__no_shared_contacts__" };

    const [projects, projectLeads, prospectAssets, documents, versions, supportingDocuments, assets, tasks, contacts, contactRelationships, outreachEngagements, users, approvals, comments, scriptCollections, scriptCollectionItems, slateCollections, slateCollectionItems] = await Promise.all([
      prisma.project.findMany({ where: projectWhere, orderBy: { updatedAt: "desc" } }),
      prisma.prospect.findMany({ where: prospectWhere, orderBy: [{ promotedProjectId: "asc" }, { updatedAt: "desc" }] }),
      prisma.prospectAsset.findMany({ where: { deletedAt: null, prospect: prospectWhere }, orderBy: { createdAt: "desc" } }),
      prisma.document.findMany({ where: documentWhere, include: { tags: { orderBy: [{ key: "asc" }, { value: "asc" }] } }, orderBy: { updatedAt: "desc" } }),
      prisma.documentVersion.findMany({
        where: { document: documentWhere },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          documentId: true,
          versionNumber: true,
          status: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          storagePath: true,
          uploadedById: true,
          createdAt: true,
          notes: true,
          markdownNotes: true,
          coverage: true
        }
      }),
      prisma.supportingDocument.findMany({ where: { deletedAt: null, scriptDocument: documentWhere }, orderBy: { createdAt: "desc" } }),
      prisma.asset.findMany({ where: canSeeLibrary ? { deletedAt: null } : { deletedAt: null, projectId: { in: projectIds } }, orderBy: { updatedAt: "desc" } }),
      prisma.task.findMany({
        where: canViewAllTasks(auth.user.appRole) ? { deletedAt: null } : { deletedAt: null, assignedToId: auth.user.id },
        include: { subtasks: { where: { deletedAt: null }, orderBy: [{ completed: "asc" }, { createdAt: "asc" }] } },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }]
      }),
      prisma.contact.findMany({ where: contactWhere, orderBy: { updatedAt: "desc" } }),
      prisma.contactRelationship.findMany({ where: canSeeLibrary ? undefined : { fromContactId: "__no_shared_contacts__" }, orderBy: { createdAt: "desc" } }),
      prisma.outreachEngagement.findMany({ where: { contact: contactWhere }, orderBy: [{ engagementDate: "desc" }, { createdAt: "desc" }] }),
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
            some: { project: projectWhere }
          }
        },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.slateCollectionItem.findMany({
        where: canSeeLibrary ? undefined : { project: projectWhere },
        orderBy: [{ sortOrder: "asc" }, { addedAt: "desc" }]
      })
    ]);

    return NextResponse.json({
      mode: "database",
      projects: projects.map(toProject),
      projectLeads: dedupeProspects(projectLeads).map(toProjectLead),
      prospectAssets: prospectAssets.map(toProspectAsset),
      documents: documents.map(toDocument),
      versions: versions.map(toVersion),
      supportingDocuments: supportingDocuments.map(toSupportingDocument),
      assets: assets.map(toAsset),
      tasks: tasks.map(toTask),
      contacts: contacts.map(toContact),
      contactRelationships: contactRelationships.map(toContactRelationship),
      outreachEngagements: outreachEngagements.map(toOutreachEngagement),
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
        if (!canManageLibrary(auth.user.appRole) && !canManageProject(auth.user.appRole, auth.user.projectRoles, stringField(body.projectId))) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ project: toProject(await prisma.project.update({
          where: { id: stringField(body.projectId) },
          data: { status: projectStatusField(body.status), auditLogs: { create: audit(auth.user.id, auth.user.email, "project.status_changed", "Project", stringField(body.projectId), { status: body.status }) } }
        })) });

      case "updateProject":
        if (!canManageLibrary(auth.user.appRole) && !canManageProject(auth.user.appRole, auth.user.projectRoles, stringField(body.projectId))) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ project: toProject(await prisma.project.update({
          where: { id: stringField(body.projectId) },
          data: {
            title: body.title !== undefined ? stringField(body.title) || "Untitled Studio Project" : undefined,
            logline: body.logline !== undefined ? optionalString(body.logline) ?? "" : undefined,
            type: body.type !== undefined ? optionalString(body.type) ?? "Feature" : undefined,
            genre: body.genre !== undefined ? optionalString(body.genre) ?? "" : undefined,
            status: body.status !== undefined ? projectStatusField(body.status) : undefined,
            hammerStage: body.stage !== undefined ? projectStageField(body.stage) : undefined,
            stage: body.stage !== undefined ? projectStageField(body.stage) : undefined,
            ownerId: body.ownerId !== undefined ? optionalString(body.ownerId) ?? null : undefined,
            auditLogs: { create: audit(auth.user.id, auth.user.email, "project.updated", "Project", stringField(body.projectId), { fields: Object.keys(body).filter((key) => key !== "action" && key !== "projectId") }) }
          }
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
        const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
        const preparedLeads = leads.map((lead) => projectLeadCreate({ ...lead, ownerIds: resolveProspectOwnerIds(lead, users) }));
        const preparedIds = preparedLeads.map((lead) => lead.id).filter((id): id is string => Boolean(id));
        const preparedExternalIds = preparedLeads.map((lead) => lead.externalId).filter((id): id is string => Boolean(id));
        const existingLeads = await prisma.prospect.findMany({
          where: {
            OR: [
              { id: { in: preparedIds } },
              { externalId: { in: preparedExternalIds } }
            ]
          },
          select: { id: true, externalId: true, title: true, creator: true, sourceLink: true, logline: true, deletedAt: true }
        });
        const existingAllLeads = await prisma.prospect.findMany({
          select: { id: true, externalId: true, title: true, creator: true, sourceLink: true, logline: true, deletedAt: true }
        });
        const existingById = new Map(existingLeads.map((lead) => [lead.id, lead]));
        const existingByExternalId = new Map(existingLeads.filter((lead) => lead.externalId).map((lead) => [lead.externalId as string, lead]));
        const existingByNaturalKey = new Map(existingAllLeads.map((lead) => [prospectNaturalKey(lead), lead]));
        const matchedLeads = preparedLeads.map((lead) => {
          const existing = lead.id && existingById.get(lead.id)
            ? existingById.get(lead.id)
            : lead.externalId && existingByExternalId.get(lead.externalId)
              ? existingByExternalId.get(lead.externalId)
              : existingByNaturalKey.get(prospectNaturalKey(lead));
          return { lead, existing };
        });
        const seenExistingIds = new Set<string>();
        const uniqueMatches = matchedLeads.filter(({ existing }) => {
          if (!existing) return true;
          if (seenExistingIds.has(existing.id)) return false;
          seenExistingIds.add(existing.id);
          return true;
        });
        const newLeads = uniqueMatches.filter(({ existing }) => !existing).map(({ lead }) => lead);
        const updateLeads = uniqueMatches.filter(({ existing }) => existing && !existing.deletedAt);
        const restoreLeads = uniqueMatches.filter(({ existing }) => existing?.deletedAt);
        if (!newLeads.length && !updateLeads.length && !restoreLeads.length) {
          await recordImportHistory({
            importType: "Prospects CSV",
            actorUserId: auth.user.id,
            actor: auth.user.email,
            rowsReceived: leads.length,
            rowsSkipped: leads.length
          });
          return NextResponse.json({ projectLeads: [], skipped: leads.length, updated: 0, restored: 0 });
        }
        const changed = await prisma.$transaction([
          ...newLeads.map((lead) => prisma.prospect.create({ data: lead })),
          ...updateLeads.map(({ lead, existing }) => {
            const { id, ...data } = lead;
            return prisma.prospect.update({
              where: { id: existing!.id },
              data
            });
          }),
          ...restoreLeads.map(({ lead, existing }) => {
            const { id, ...data } = lead;
            return prisma.prospect.update({
              where: { id: existing!.id },
              data: { ...data, deletedAt: null }
            });
          })
        ]);
        await recordImportHistory({
          importType: "Prospects CSV",
          actorUserId: auth.user.id,
          actor: auth.user.email,
          rowsReceived: leads.length,
          rowsCreated: newLeads.length,
          rowsUpdated: updateLeads.length,
          rowsRestored: restoreLeads.length,
          rowsSkipped: leads.length - uniqueMatches.length
        });
        return NextResponse.json({ projectLeads: changed.map(toProjectLead), skipped: leads.length - uniqueMatches.length, updated: updateLeads.length, restored: restoreLeads.length });
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
        if (!await canManageDocumentVersionNotes(auth.user.appRole, auth.user.projectRoles, stringField(body.versionId))) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ version: toVersion(await prisma.documentVersion.update({
          where: { id: stringField(body.versionId) },
          data: { notes: stringField(body.notes) }
        })) });

      case "updateDocumentVersionMarkdown":
        if (!await canManageDocumentVersionNotes(auth.user.appRole, auth.user.projectRoles, stringField(body.versionId))) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ version: toVersion(await prisma.documentVersion.update({
          where: { id: stringField(body.versionId) },
          data: { markdownNotes: optionalString(body.markdownNotes) ?? null }
        })) });

      case "generateScriptCoverage": {
        const version = await prisma.documentVersion.findUnique({
          where: { id: stringField(body.versionId) },
          include: { document: { select: { id: true, title: true, writerName: true, source: true, projectId: true, deletedAt: true } } }
        });
        if (!version || version.document.deletedAt) return NextResponse.json({ error: "Script version not found." }, { status: 404 });
        if (!canAccessAssociatedProject(auth.user.appRole, auth.user.projectRoles, version.document.projectId)) return NextResponse.json(forbidden(), { status: 403 });
        const generated = generateLocalScriptCoverage({
          title: version.document.title,
          writerName: version.document.writerName,
          source: version.document.source,
          fileName: version.fileName,
          versionNumber: version.versionNumber,
          extractedText: version.extractedText
        });
        const coverage = await prisma.scriptCoverage.upsert({
          where: { documentVersionId: version.id },
          create: {
            documentVersionId: version.id,
            aiStatus: generated.warning ? "WARNING" : "COMPLETE",
            aiModel: generated.model,
            aiSummaryJson: generated.summary as Prisma.InputJsonValue,
            aiGeneratedAt: new Date(),
            createdById: auth.user.id,
            updatedById: auth.user.id
          },
          update: {
            aiStatus: generated.warning ? "WARNING" : "COMPLETE",
            aiModel: generated.model,
            aiSummaryJson: generated.summary as Prisma.InputJsonValue,
            aiGeneratedAt: new Date(),
            updatedById: auth.user.id
          }
        });
        await prisma.auditLog.create({
          data: audit(auth.user.id, auth.user.email, "script.coverage_generated", "ScriptCoverage", coverage.id, { documentId: version.document.id, versionId: version.id, provider: generated.provider, warning: generated.warning })
        }).catch(() => undefined);
        return NextResponse.json({ coverage: toScriptCoverage(coverage), warning: generated.warning });
      }

      case "updateScriptCoverage": {
        const version = await prisma.documentVersion.findUnique({
          where: { id: stringField(body.versionId) },
          select: { id: true, document: { select: { id: true, projectId: true, deletedAt: true } } }
        });
        if (!version || version.document.deletedAt) return NextResponse.json({ error: "Script version not found." }, { status: 404 });
        if (!canAccessAssociatedProject(auth.user.appRole, auth.user.projectRoles, version.document.projectId, true)) return NextResponse.json(forbidden(), { status: 403 });
        const humanCriteria = normalizeHumanCriteria(body.humanCriteria);
        const coverage = await prisma.scriptCoverage.upsert({
          where: { documentVersionId: version.id },
          create: {
            documentVersionId: version.id,
            aiStatus: "NOT_RUN",
            humanOverallScore: nullableScore(body.humanOverallScore),
            humanRecommendation: optionalString(body.humanRecommendation),
            humanCriteriaJson: humanCriteria as Prisma.InputJsonValue,
            humanNotes: optionalText(body.humanNotes),
            createdById: auth.user.id,
            updatedById: auth.user.id
          },
          update: {
            humanOverallScore: nullableScore(body.humanOverallScore),
            humanRecommendation: optionalString(body.humanRecommendation),
            humanCriteriaJson: humanCriteria as Prisma.InputJsonValue,
            humanNotes: optionalText(body.humanNotes),
            updatedById: auth.user.id
          }
        });
        await prisma.auditLog.create({
          data: audit(auth.user.id, auth.user.email, "script.coverage_updated", "ScriptCoverage", coverage.id, { documentId: version.document.id, versionId: version.id, humanRecommendation: coverage.humanRecommendation, humanOverallScore: coverage.humanOverallScore })
        }).catch(() => undefined);
        return NextResponse.json({ coverage: toScriptCoverage(coverage) });
      }

      case "createComment": {
        const targetType = commentTargetTypeField(body.targetType);
        const targetId = stringField(body.targetId);
        const targetAssociation = await resolveCommentTargetAssociation(targetType, targetId);
        if (!targetAssociation.exists) return NextResponse.json({ error: "Comment target not found." }, { status: 404 });
        if (!canAccessAssociatedProject(auth.user.appRole, auth.user.projectRoles, targetAssociation.projectId)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ comment: toComment(await prisma.comment.create({
          data: {
            projectId: targetAssociation.projectId,
            targetType,
            targetId,
            body: textField(body.body),
            metadataJson: noteMetadataField(body.metadataJson),
            visibility: commentVisibilityField(body.visibility),
            createdById: auth.user.id
          }
        })) }, { status: 201 });
      }

      case "updateComment": {
        const commentId = stringField(body.commentId);
        const existingComment = await prisma.comment.findUnique({ where: { id: commentId } });
        if (!existingComment) return NextResponse.json({ error: "Note not found." }, { status: 404 });
        if (!canAccessAssociatedProject(auth.user.appRole, auth.user.projectRoles, existingComment.projectId ?? undefined)) return NextResponse.json(forbidden(), { status: 403 });
        const targetType = commentTargetTypeField(body.targetType);
        const targetId = stringField(body.targetId);
        const targetAssociation = await resolveCommentTargetAssociation(targetType, targetId);
        if (!targetAssociation.exists) return NextResponse.json({ error: "Comment target not found." }, { status: 404 });
        if (!canAccessAssociatedProject(auth.user.appRole, auth.user.projectRoles, targetAssociation.projectId)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ comment: toComment(await prisma.comment.update({
          where: { id: commentId },
          data: {
            projectId: targetAssociation.projectId,
            targetType,
            targetId,
            body: textField(body.body),
            metadataJson: noteMetadataField(body.metadataJson),
            visibility: commentVisibilityField(body.visibility)
          }
        })) });
      }

      case "deleteComment": {
        const commentId = stringField(body.commentId);
        const existingComment = await prisma.comment.findUnique({ where: { id: commentId } });
        if (!existingComment) return NextResponse.json({ error: "Note not found." }, { status: 404 });
        if (!canAccessAssociatedProject(auth.user.appRole, auth.user.projectRoles, existingComment.projectId ?? undefined)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ comment: toComment(await prisma.comment.update({
          where: { id: commentId },
          data: { status: "ARCHIVED" }
        })) });
      }

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

      case "archiveScriptCollection":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ scriptCollection: toScriptCollection(await prisma.scriptCollection.update({
          where: { id: stringField(body.collectionId) },
          data: { status: "ARCHIVED" }
        })) });

      case "deleteScriptCollection":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        await prisma.scriptCollection.delete({ where: { id: stringField(body.collectionId) } });
        return NextResponse.json({ ok: true });

      case "reorderScriptCollectionItems": {
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        const itemIds = stringArrayField(body.collectionItemIds);
        if (!itemIds.length) return NextResponse.json({ ok: true });
        const items = await prisma.scriptCollectionItem.findMany({ where: { id: { in: itemIds } }, select: { id: true, collectionId: true } });
        if (items.length !== itemIds.length || new Set(items.map((item) => item.collectionId)).size !== 1) return NextResponse.json({ error: "Collection items must belong to one collection." }, { status: 400 });
        await prisma.$transaction(itemIds.map((itemId, index) => prisma.scriptCollectionItem.update({
          where: { id: itemId },
          data: { sortOrder: index + 1 }
        })));
        return NextResponse.json({ ok: true });
      }

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

      case "archiveSlateCollection":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ slateCollection: toSlateCollection(await prisma.slateCollection.update({
          where: { id: stringField(body.collectionId) },
          data: { status: "ARCHIVED" }
        })) });

      case "deleteSlateCollection":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        await prisma.slateCollection.delete({ where: { id: stringField(body.collectionId) } });
        return NextResponse.json({ ok: true });

      case "reorderSlateCollectionItems": {
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        const itemIds = stringArrayField(body.collectionItemIds);
        if (!itemIds.length) return NextResponse.json({ ok: true });
        const items = await prisma.slateCollectionItem.findMany({ where: { id: { in: itemIds } }, select: { id: true, collectionId: true } });
        if (items.length !== itemIds.length || new Set(items.map((item) => item.collectionId)).size !== 1) return NextResponse.json({ error: "Collection items must belong to one collection." }, { status: 400 });
        await prisma.$transaction(itemIds.map((itemId, index) => prisma.slateCollectionItem.update({
          where: { id: itemId },
          data: { sortOrder: index + 1 }
        })));
        return NextResponse.json({ ok: true });
      }

      case "assignDocumentToProject": {
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        const documentId = stringField(body.documentId);
        const projectId = stringField(body.projectId);
        if (!documentId || !projectId) return NextResponse.json({ error: "Document and project are required." }, { status: 400 });
        const [document, project] = await Promise.all([
          prisma.document.findUnique({ where: { id: documentId }, select: { id: true, deletedAt: true, versions: { select: { id: true } } } }),
          prisma.project.findUnique({ where: { id: projectId }, select: { id: true, deletedAt: true } })
        ]);
        if (!document || document.deletedAt) return NextResponse.json({ error: "Document not found." }, { status: 404 });
        if (!project || project.deletedAt) return NextResponse.json({ error: "Project not found." }, { status: 404 });
        const versionIds = document.versions.map((version) => version.id);
        const [updatedDocument] = await prisma.$transaction([
          prisma.document.update({ where: { id: documentId }, data: { projectId, submittedAt: null, updatedAt: new Date() }, include: { tags: { orderBy: [{ key: "asc" }, { value: "asc" }] } } }),
          prisma.supportingDocument.updateMany({ where: { scriptDocumentId: documentId, deletedAt: null }, data: { projectId } }),
          prisma.comment.updateMany({ where: { OR: [{ targetType: "DOCUMENT", targetId: documentId }, ...(versionIds.length ? [{ targetType: "DOCUMENT_VERSION" as const, targetId: { in: versionIds } }] : [])] }, data: { projectId } })
        ]);
        return NextResponse.json({ document: toDocument(updatedDocument) });
      }

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

      case "updateDocumentTags": {
        const documentId = stringField(body.documentId);
        if (!await canManageDocumentMetadata(auth.user.appRole, auth.user.projectRoles, documentId)) return NextResponse.json(forbidden(), { status: 403 });
        const tags = documentTagsField(body.tags);
        await prisma.documentTag.deleteMany({ where: { documentId } });
        const document = await prisma.document.update({
          where: { id: documentId },
          data: {
            updatedAt: new Date(),
            ...(tags.length ? {
              tags: {
                createMany: {
                  data: tags.map((tag) => ({ key: tag.key, value: tag.value, createdById: auth.user.id })),
                  skipDuplicates: true
                }
              }
            } : {})
          },
          include: { tags: { orderBy: [{ key: "asc" }, { value: "asc" }] } }
        });
        return NextResponse.json({ document: toDocument(document) });
      }

      case "deleteDocument":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ document: toDocument(await prisma.document.update({
          where: { id: stringField(body.documentId) },
          data: { deletedAt: new Date() }
        })) });

      case "uploadSupportingDocument": {
        const scriptDocumentId = stringField(body.scriptDocumentId);
        const scriptDocument = await prisma.document.findUnique({ where: { id: scriptDocumentId }, select: { id: true, projectId: true, deletedAt: true } });
        if (!scriptDocument || scriptDocument.deletedAt) return NextResponse.json({ error: "Script document not found." }, { status: 404 });
        if (!canAccessAssociatedProject(auth.user.appRole, auth.user.projectRoles, scriptDocument.projectId)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ supportingDocument: toSupportingDocument(await prisma.supportingDocument.create({
          data: {
            scriptDocumentId,
            projectId: scriptDocument.projectId,
            title: stringField(body.title) || stringField(body.fileName) || "Supporting Document",
            type: supportingTypeField(body.type),
            source: optionalString(body.source),
            notes: optionalString(body.notes),
            fileName: stringField(body.fileName),
            fileType: stringField(body.fileType) || "application/octet-stream",
            fileSize: numberField(body.fileSize),
            storagePath: stringField(body.storagePath),
            dataUrl: optionalString(body.dataUrl),
            extractedText: optionalString(body.extractedText),
            uploadedById: auth.user.id
          }
        })) });
      }

      case "deleteSupportingDocument": {
        const supportingDocument = await prisma.supportingDocument.findUnique({ where: { id: stringField(body.documentId) }, select: { id: true, projectId: true, scriptDocument: { select: { projectId: true } }, deletedAt: true } });
        if (!supportingDocument || supportingDocument.deletedAt) return NextResponse.json({ error: "Supporting document not found." }, { status: 404 });
        if (!canAccessAssociatedProject(auth.user.appRole, auth.user.projectRoles, supportingDocument.projectId ?? supportingDocument.scriptDocument.projectId)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ supportingDocument: toSupportingDocument(await prisma.supportingDocument.update({
          where: { id: supportingDocument.id },
          data: { deletedAt: new Date() }
        })) });
      }

      case "uploadProspectAsset":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ prospectAsset: toProspectAsset(await prisma.prospectAsset.create({
          data: {
            prospectId: stringField(body.prospectId),
            title: stringField(body.title) || stringField(body.fileName) || "Prospect Asset",
            description: optionalString(body.description),
            source: optionalString(body.source),
            fileName: stringField(body.fileName),
            fileType: stringField(body.fileType) || "application/octet-stream",
            fileSize: numberField(body.fileSize),
            storagePath: stringField(body.storagePath),
            dataUrl: optionalString(body.dataUrl),
            uploadedById: auth.user.id
          }
        })) });

      case "deleteProspectAsset":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ prospectAsset: toProspectAsset(await prisma.prospectAsset.update({
          where: { id: stringField(body.assetId) },
          data: { deletedAt: new Date() }
        })) });

      case "uploadReferenceImage": {
        const projectId = stringField(body.projectId);
        const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, deletedAt: true } });
        if (!project || project.deletedAt) return NextResponse.json({ error: "Project not found." }, { status: 404 });
        if (!canAccessAssociatedProject(auth.user.appRole, auth.user.projectRoles, projectId)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ asset: toAsset(await prisma.asset.create({
          data: {
            projectId,
            title: stringField(body.title) || stringField(body.fileName) || "Reference Image",
            description: optionalString(body.description),
            source: optionalString(body.source),
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
      }

      case "createTask": {
        const association = await resolveTaskAssociation(body);
        if (!association.valid) return NextResponse.json({ error: association.error }, { status: association.status });
        if (!canAccessAssociatedProject(auth.user.appRole, auth.user.projectRoles, association.projectId, true)) return NextResponse.json(forbidden(), { status: 403 });
        const taskCount = await prisma.task.count({ where: { deletedAt: null } });
        return NextResponse.json({ task: toTask(await prisma.task.create({
          data: {
            projectId: association.projectId,
            title: stringField(body.title) || "Untitled assignment",
            description: optionalString(body.description),
            assignedToId: optionalString(body.assignedToId),
            createdById: auth.user.id,
            dueDate: dateField(body.dueDate),
            priority: priorityField(body.priority),
            status: taskStatusField(body.status),
            sortOrder: taskCount + 1,
            targetType: association.targetType,
            targetId: association.targetId
          }
        })) });
      }

      case "updateTask": {
        const existingTask = await prisma.task.findUnique({ where: { id: stringField(body.taskId) }, select: { id: true, assignedToId: true, createdById: true, deletedAt: true } });
        if (!canAccessTaskRecord(auth.user.appRole, auth.user.id, existingTask)) return NextResponse.json(forbidden(), { status: 403 });
        const association = body.projectId !== undefined || body.targetType !== undefined || body.targetId !== undefined ? await resolveTaskAssociation(body) : undefined;
        if (association && !association.valid) return NextResponse.json({ error: association.error }, { status: association.status });
        if (association && !canAccessAssociatedProject(auth.user.appRole, auth.user.projectRoles, association.projectId, true)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ task: toTask(await prisma.task.update({
          where: { id: existingTask!.id },
          data: {
            projectId: association ? association.projectId : undefined,
            title: body.title !== undefined ? stringField(body.title) || "Untitled assignment" : undefined,
            description: body.description !== undefined ? optionalString(body.description) ?? null : undefined,
            assignedToId: body.assignedToId !== undefined ? optionalString(body.assignedToId) ?? null : undefined,
            dueDate: body.dueDate !== undefined ? dateField(body.dueDate) ?? null : undefined,
            priority: body.priority ? priorityField(body.priority) : undefined,
            status: body.status ? taskStatusField(body.status) : undefined,
            targetType: association ? association.targetType : undefined,
            targetId: association ? association.targetId : undefined
          }
        })) });
      }

      case "deleteTask":
        if (!canViewAllTasks(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ task: toTask(await prisma.task.update({
          where: { id: stringField(body.taskId) },
          data: { deletedAt: new Date() }
        })) });

      case "reorderTasks": {
        const taskIds = stringArrayField(body.taskIds);
        if (!taskIds.length) return NextResponse.json({ ok: true });
        const matchedTasks = await prisma.task.findMany({
          where: { id: { in: taskIds }, deletedAt: null },
          select: { id: true, assignedToId: true, createdById: true, deletedAt: true }
        });
        if (matchedTasks.length !== taskIds.length || matchedTasks.some((task) => !canAccessTaskRecord(auth.user.appRole, auth.user.id, task))) return NextResponse.json(forbidden(), { status: 403 });
        await prisma.$transaction(taskIds.map((taskId, index) => prisma.task.update({
          where: { id: taskId },
          data: { sortOrder: index + 1 }
        })));
        return NextResponse.json({ ok: true });
      }

      case "createTaskSubtask": {
        const task = await prisma.task.findUnique({ where: { id: stringField(body.taskId) }, select: { id: true, assignedToId: true, createdById: true, deletedAt: true } });
        if (!canAccessTaskRecord(auth.user.appRole, auth.user.id, task)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ subtask: toTaskSubtask(await prisma.taskSubtask.create({
          data: {
            taskId: task!.id,
            title: stringField(body.title) || "Untitled subtask",
            createdById: auth.user.id
          }
        })) }, { status: 201 });
      }

      case "updateTaskSubtask": {
        const subtask = await prisma.taskSubtask.findUnique({
          where: { id: stringField(body.subtaskId) },
          include: { task: { select: { id: true, assignedToId: true, createdById: true, deletedAt: true } } }
        });
        if (!subtask || subtask.deletedAt || !canAccessTaskRecord(auth.user.appRole, auth.user.id, subtask.task)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ subtask: toTaskSubtask(await prisma.taskSubtask.update({
          where: { id: subtask.id },
          data: {
            title: body.title !== undefined ? stringField(body.title) || "Untitled subtask" : undefined,
            completed: body.completed !== undefined ? Boolean(body.completed) : undefined
          }
        })) });
      }

      case "deleteTaskSubtask": {
        const subtask = await prisma.taskSubtask.findUnique({
          where: { id: stringField(body.subtaskId) },
          include: { task: { select: { id: true, assignedToId: true, createdById: true, deletedAt: true } } }
        });
        if (!subtask || subtask.deletedAt || !canAccessTaskRecord(auth.user.appRole, auth.user.id, subtask.task)) return NextResponse.json(forbidden(), { status: 403 });
        return NextResponse.json({ subtask: toTaskSubtask(await prisma.taskSubtask.update({
          where: { id: subtask.id },
          data: { deletedAt: new Date() }
        })) });
      }

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
        const contactsToImport = Array.isArray(body.contacts) ? body.contacts : [];
        const importedContacts = await prisma.$transaction(contactsToImport.map((item) => {
          const contact = item as Record<string, unknown>;
          return prisma.contact.create({
            data: contactCreateData(contact)
          });
        }));
        await recordImportHistory({
          importType: "Outreach CSV",
          actorUserId: auth.user.id,
          actor: auth.user.email,
          rowsReceived: contactsToImport.length,
          rowsCreated: importedContacts.length,
          rowsSkipped: contactsToImport.length - importedContacts.length
        });
        return NextResponse.json({ contacts: importedContacts.map(toContact) });

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
            notes: body.notes !== undefined ? optionalString(body.notes) : undefined,
            isTalent: body.isTalent !== undefined ? Boolean(body.isTalent) : undefined,
            talentAgency: body.talentAgency !== undefined ? optionalString(body.talentAgency) : undefined,
            talentCredits: body.talentCredits !== undefined ? optionalString(body.talentCredits) : undefined,
            talentGenre: body.talentGenre !== undefined ? optionalString(body.talentGenre) : undefined,
            talentRole: body.talentRole !== undefined ? optionalString(body.talentRole) : undefined,
            talentMetWith: body.talentMetWith !== undefined ? optionalString(body.talentMetWith) : undefined,
            talentBased: body.talentBased !== undefined ? optionalString(body.talentBased) : undefined
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

      case "createOutreachEngagement": {
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        const contactId = stringField(body.contactId);
        const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { id: true, deletedAt: true } });
        if (!contact || contact.deletedAt) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
        const engagementDate = dateField(body.engagementDate) ?? new Date();
        const followUpDate = dateField(body.followUpDate);
        const summary = textField(body.summary).trim();
        if (!summary) return NextResponse.json({ error: "Engagement notes are required." }, { status: 400 });
        const engagement = await prisma.$transaction(async (tx) => {
          const createdEngagement = await tx.outreachEngagement.create({
            data: {
              contactId,
              type: outreachEngagementTypeField(body.type),
              engagementDate,
              status: contactStatusField(body.status),
              summary,
              nextStep: optionalText(body.nextStep),
              followUpDate,
              createdById: auth.user.id
            }
          });
          await tx.contact.update({
            where: { id: contactId },
            data: {
              status: contactStatusField(body.status),
              lastContacted: engagementDate,
              nextFollowUp: followUpDate ?? undefined,
              talentMetWith: dateString(engagementDate)
            }
          });
          return createdEngagement;
        });
        return NextResponse.json({ outreachEngagement: toOutreachEngagement(engagement) }, { status: 201 });
      }

      case "updateOutreachEngagement": {
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        const engagement = await prisma.outreachEngagement.findUnique({ where: { id: stringField(body.engagementId) }, select: { id: true, contactId: true } });
        if (!engagement) return NextResponse.json({ error: "Engagement not found." }, { status: 404 });
        return NextResponse.json({ outreachEngagement: toOutreachEngagement(await prisma.outreachEngagement.update({
          where: { id: engagement.id },
          data: {
            type: body.type !== undefined ? outreachEngagementTypeField(body.type) : undefined,
            engagementDate: body.engagementDate !== undefined ? dateField(body.engagementDate) ?? new Date() : undefined,
            status: body.status !== undefined ? contactStatusField(body.status) : undefined,
            summary: body.summary !== undefined ? textField(body.summary).trim() || "Updated engagement note." : undefined,
            nextStep: body.nextStep !== undefined ? optionalText(body.nextStep) : undefined,
            followUpDate: body.followUpDate !== undefined ? dateField(body.followUpDate) ?? null : undefined
          }
        })) });
      }

      case "deleteOutreachEngagement":
        if (!canManageLibrary(auth.user.appRole)) return NextResponse.json(forbidden(), { status: 403 });
        await prisma.outreachEngagement.delete({ where: { id: stringField(body.engagementId) } });
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
            dataUrl: optionalString(body.dataUrl),
            extractedText: optionalString(body.extractedText),
      uploadedById: userId,
      notes: optionalString(body.notes),
      markdownNotes: optionalString(body.markdownNotes)
    }
  });
  const updatedDocument = await prisma.document.update({
    where: { id: document.id },
    data: {
      currentVersionId: version.id,
      title: stringField(body.title) || document.title,
      type: documentTypeField(body.type),
      writerName: optionalString(body.writerName) ?? document.writerName,
      source: body.source !== undefined ? optionalString(body.source) ?? null : document.source,
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
    ownerIds: lead.ownerIds,
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

function dedupeProspects(prospects: Prospect[]) {
  const byKey = new Map<string, Prospect>();
  for (const prospect of prospects) {
    const key = prospectNaturalKey(prospect);
    const existing = byKey.get(key);
    if (!existing || prospectScore(prospect) > prospectScore(existing)) {
      byKey.set(key, prospect);
    }
  }
  return Array.from(byKey.values()).sort((left, right) => {
    if (Boolean(left.promotedProjectId) !== Boolean(right.promotedProjectId)) return left.promotedProjectId ? -1 : 1;
    return right.updatedAt.getTime() - left.updatedAt.getTime();
  });
}

function prospectNaturalKey(prospect: Pick<Prospect, "externalId" | "title" | "creator" | "sourceLink" | "logline"> | Prisma.ProspectCreateInput) {
  const externalId = typeof prospect.externalId === "string" ? normalizeProspectKeyPart(prospect.externalId) : "";
  if (externalId) return `external:${externalId}`;
  return [
    "natural",
    normalizeProspectKeyPart(typeof prospect.title === "string" ? prospect.title : ""),
    normalizeProspectKeyPart(typeof prospect.creator === "string" ? prospect.creator : ""),
    normalizeProspectKeyPart(typeof prospect.sourceLink === "string" ? prospect.sourceLink : ""),
    normalizeProspectKeyPart(typeof prospect.logline === "string" ? prospect.logline : "")
  ].join(":");
}

function prospectScore(prospect: Prospect) {
  let score = prospect.updatedAt.getTime();
  if (prospect.promotedProjectId) score += 10_000_000_000_000;
  if (prospect.scriptPdf) score += 1_000;
  if (prospect.notes) score += 100;
  return score;
}

function normalizeProspectKeyPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 180);
}

function toUser(user: { id: string; email: string; name: string; avatarUrl: string | null; googleId: string | null; role: UserRole; appRole?: string }) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl ?? undefined, googleId: user.googleId ?? "", role: hammerRoleForAppRole(user.appRole) ?? user.role };
}

function toDocument(document: { id: string; projectId: string | null; title: string; type: DocumentType; currentVersionId: string | null; createdById: string | null; updatedAt: Date; writerName: string | null; source: string | null; contactId: string | null; submittedAt: Date | null; tags?: Array<{ id: string; documentId: string; key: string; value: string; createdById: string | null; createdAt: Date }> }) {
  return {
    id: document.id,
    projectId: document.projectId ?? undefined,
    title: document.title,
    type: document.type,
    currentVersionId: document.currentVersionId ?? "",
    createdById: document.createdById ?? "",
    updatedAt: dateString(document.updatedAt),
    writerName: document.writerName ?? undefined,
    source: document.source ?? undefined,
    contactId: document.contactId ?? undefined,
    submittedAt: document.submittedAt ? dateString(document.submittedAt) : undefined,
    tags: document.tags?.map(toDocumentTag) ?? []
  };
}

function toDocumentTag(tag: { id: string; documentId: string; key: string; value: string; createdById: string | null; createdAt: Date }) {
  return { id: tag.id, documentId: tag.documentId, key: tag.key, value: tag.value, createdById: tag.createdById ?? undefined, createdAt: dateString(tag.createdAt) };
}

function toVersion(version: { id: string; documentId: string; versionNumber: number; status: DocumentVersionStatus; fileName: string; fileType: string; fileSize: number; storagePath: string; dataUrl?: string | null; uploadedById: string | null; createdAt: Date; notes: string | null; markdownNotes?: string | null; extractedText?: string | null; coverage?: ScriptCoverageRecord | null }) {
  return { id: version.id, documentId: version.documentId, versionNumber: version.versionNumber, status: version.status, fileName: version.fileName, fileType: version.fileType, fileSize: version.fileSize, storagePath: version.storagePath, dataUrl: version.dataUrl ?? undefined, uploadedById: version.uploadedById ?? "", createdAt: dateString(version.createdAt), notes: version.notes ?? "", markdownNotes: version.markdownNotes ?? undefined, extractedText: version.extractedText ?? "", coverage: version.coverage ? toScriptCoverage(version.coverage) : undefined };
}

type ScriptCoverageRecord = {
  id: string;
  documentVersionId: string;
  aiStatus: string;
  aiModel: string | null;
  aiSummaryJson: Prisma.JsonValue | null;
  aiGeneratedAt: Date | null;
  humanOverallScore: number | null;
  humanRecommendation: string | null;
  humanCriteriaJson: Prisma.JsonValue | null;
  humanNotes: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toScriptCoverage(coverage: ScriptCoverageRecord) {
  return {
    id: coverage.id,
    documentVersionId: coverage.documentVersionId,
    aiStatus: coverage.aiStatus,
    aiModel: coverage.aiModel ?? undefined,
    aiSummary: coverage.aiSummaryJson ? normalizeSummary(coverage.aiSummaryJson) : undefined,
    aiGeneratedAt: coverage.aiGeneratedAt ? dateString(coverage.aiGeneratedAt) : undefined,
    humanOverallScore: coverage.humanOverallScore ?? undefined,
    humanRecommendation: coverage.humanRecommendation ?? undefined,
    humanCriteria: normalizeHumanCriteria(coverage.humanCriteriaJson),
    humanNotes: coverage.humanNotes ?? undefined,
    createdById: coverage.createdById ?? undefined,
    updatedById: coverage.updatedById ?? undefined,
    updatedAt: dateString(coverage.updatedAt)
  };
}

function toSupportingDocument(document: { id: string; scriptDocumentId: string; title: string; type: SupportingDocumentType; source?: string | null; notes: string | null; fileName: string; fileType: string; fileSize: number; storagePath: string; dataUrl?: string | null; extractedText: string | null; uploadedById: string | null; createdAt: Date }) {
  return { id: document.id, scriptDocumentId: document.scriptDocumentId, title: document.title, type: document.type, source: document.source ?? undefined, notes: document.notes ?? undefined, fileName: document.fileName, fileType: document.fileType, fileSize: document.fileSize, storagePath: document.storagePath, dataUrl: document.dataUrl ?? undefined, extractedText: document.extractedText ?? "", uploadedById: document.uploadedById ?? "", uploadedAt: dateString(document.createdAt) };
}

function toProspectAsset(asset: { id: string; prospectId: string; title: string; description: string | null; source?: string | null; fileName: string; fileType: string; fileSize: number; storagePath: string; dataUrl: string | null; uploadedById: string | null; createdAt: Date }) {
  return { id: asset.id, prospectId: asset.prospectId, title: asset.title, description: asset.description ?? "", source: asset.source ?? undefined, fileName: asset.fileName, fileType: asset.fileType, fileSize: asset.fileSize, storagePath: asset.storagePath, dataUrl: asset.dataUrl ?? undefined, uploadedById: asset.uploadedById ?? "", uploadedAt: dateString(asset.createdAt) };
}

function toAsset(asset: { id: string; projectId: string; title: string; description: string | null; source?: string | null; assetType: AssetType; fileName: string; fileType: string; fileSize: number; storagePath: string; thumbnailPath: string | null; status: AssetStatus; uploadedById: string | null; dataUrl?: string | null }) {
  return { id: asset.id, projectId: asset.projectId, title: asset.title, description: asset.description ?? "", source: asset.source ?? undefined, assetType: asset.assetType, fileName: asset.fileName, fileType: asset.fileType, fileSize: asset.fileSize, storagePath: asset.storagePath, thumbnailPath: asset.thumbnailPath ?? undefined, status: asset.status, uploadedById: asset.uploadedById ?? "", imageUrl: asset.dataUrl ?? undefined };
}

function toTask(task: { id: string; projectId: string | null; title: string; description: string | null; assignedToId: string | null; createdById: string | null; dueDate: Date | null; priority: TaskPriority; status: TaskStatus; sortOrder?: number; targetType: TaskTargetType | null; targetId: string | null; createdAt?: Date; updatedAt?: Date; subtasks?: Array<{ id: string; taskId: string; title: string; completed: boolean; createdById: string | null; createdAt: Date; updatedAt: Date }> }) {
  return { id: task.id, projectId: task.projectId ?? "", title: task.title, description: task.description ?? "", assignedToId: task.assignedToId ?? "", createdById: task.createdById ?? "", dueDate: task.dueDate ? dateString(task.dueDate) : "", priority: task.priority, status: task.status, sortOrder: task.sortOrder ?? 0, targetType: task.targetType ?? "GENERAL", targetId: task.targetId ?? task.projectId ?? "", subtasks: task.subtasks?.map(toTaskSubtask) ?? [], createdAt: task.createdAt ? dateTimeString(task.createdAt) : undefined, updatedAt: task.updatedAt ? dateTimeString(task.updatedAt) : undefined };
}

function toTaskSubtask(subtask: { id: string; taskId: string; title: string; completed: boolean; createdById: string | null; createdAt: Date; updatedAt: Date }) {
  return { id: subtask.id, taskId: subtask.taskId, title: subtask.title, completed: subtask.completed, createdById: subtask.createdById ?? undefined, createdAt: dateTimeString(subtask.createdAt), updatedAt: dateTimeString(subtask.updatedAt) };
}

function toContact(contact: { id: string; name: string; company: string | null; type: ContactType; title: string | null; email: string | null; phone: string | null; location: string | null; website: string | null; status: ContactStatus; ownerId: string | null; tags: string[]; lastContacted: Date | null; nextFollowUp: Date | null; projectIds: string[]; notes: string | null; isTalent: boolean; talentAgency: string | null; talentCredits: string | null; talentGenre: string | null; talentRole: string | null; talentMetWith: string | null; talentBased: string | null }) {
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
    notes: contact.notes ?? "",
    isTalent: contact.isTalent,
    talentAgency: contact.talentAgency ?? undefined,
    talentCredits: contact.talentCredits ?? undefined,
    talentGenre: contact.talentGenre ?? undefined,
    talentRole: contact.talentRole ?? undefined,
    talentMetWith: contact.talentMetWith ?? undefined,
    talentBased: contact.talentBased ?? undefined
  };
}

function toContactRelationship(relationship: { id: string; fromContactId: string; toContactId: string; relationshipType: ContactRelationshipType; notes: string | null; createdAt: Date }) {
  return { id: relationship.id, fromContactId: relationship.fromContactId, toContactId: relationship.toContactId, relationshipType: relationship.relationshipType, notes: relationship.notes ?? undefined, createdAt: dateString(relationship.createdAt) };
}

function toOutreachEngagement(engagement: { id: string; contactId: string; type: OutreachEngagementType; engagementDate: Date; status: ContactStatus; summary: string; nextStep: string | null; followUpDate: Date | null; createdById: string | null; createdAt: Date; updatedAt: Date }) {
  return {
    id: engagement.id,
    contactId: engagement.contactId,
    type: engagement.type,
    engagementDate: dateString(engagement.engagementDate),
    status: engagement.status,
    summary: engagement.summary,
    nextStep: engagement.nextStep ?? undefined,
    followUpDate: engagement.followUpDate ? dateString(engagement.followUpDate) : undefined,
    createdById: engagement.createdById ?? undefined,
    createdAt: dateTimeString(engagement.createdAt),
    updatedAt: dateTimeString(engagement.updatedAt)
  };
}

function toApproval(approval: { id: string; projectId: string | null; targetType: string; targetId: string; requestedById: string | null; reviewerId: string | null; status: string; decisionNotes: string | null; createdAt: Date; decidedAt: Date | null }) {
  return { id: approval.id, projectId: approval.projectId ?? "", targetType: approval.targetType, targetId: approval.targetId, requestedById: approval.requestedById ?? "", reviewerId: approval.reviewerId ?? "", status: approval.status, decisionNotes: approval.decisionNotes ?? undefined, createdAt: dateString(approval.createdAt), decidedAt: approval.decidedAt ? dateString(approval.decidedAt) : undefined };
}

function toComment(comment: { id: string; targetType: CommentTargetType; targetId: string; body: string; metadataJson?: Prisma.JsonValue | null; visibility: CommentVisibility; status: string; createdById: string | null; createdAt: Date }) {
  return { id: comment.id, targetType: comment.targetType, targetId: comment.targetId, body: comment.body, metadataJson: comment.metadataJson ?? undefined, visibility: comment.visibility, status: comment.status, createdById: comment.createdById ?? "", createdAt: dateTimeString(comment.createdAt) };
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

async function canManageDocumentVersionNotes(role: string, projectRoles: Record<string, string>, versionId: string) {
  if (canManageLibrary(role)) return true;
  const version = await prisma.documentVersion.findUnique({ where: { id: versionId }, select: { document: { select: { projectId: true, deletedAt: true } } } });
  const document = version?.document;
  if (!document || document.deletedAt || !document.projectId) return false;
  return Boolean(projectRoles[document.projectId]);
}

function canUpdateProjectLeadBasicFields(body: ActionBody) {
  const allowed = new Set(["action", "leadId", "title", "logline", "creator", "urgencyLabel", "genre", "priorityScore", "ownerIds"]);
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

function canAccessTaskRecord(role: string, userId: string, task?: { assignedToId: string | null; createdById: string | null; deletedAt: Date | null } | null) {
  if (!task || task.deletedAt) return false;
  return canViewAllTasks(role) || task.assignedToId === userId || task.createdById === userId;
}

function canAccessAssociatedProject(role: string, projectRoles: Record<string, string>, projectId?: string | null, allowUnscoped = false) {
  if (canManageLibrary(role)) return true;
  if (!projectId) return allowUnscoped;
  return Boolean(projectRoles[projectId]);
}

type TargetAssociation = { exists: boolean; projectId?: string | null };

type ResolvedTaskAssociation =
  | { valid: true; projectId: string | null; targetType: TaskTargetType; targetId: string | null }
  | { valid: false; status: number; error: string };

async function resolveCommentTargetAssociation(targetType: CommentTargetType, targetId: string): Promise<TargetAssociation> {
  if (!targetId) return { exists: false };
  if (targetType === "PROJECT") {
    const project = await prisma.project.findUnique({ where: { id: targetId }, select: { id: true, deletedAt: true } });
    return { exists: Boolean(project && !project.deletedAt), projectId: project?.id };
  }
  if (targetType === "PROSPECT") {
    const prospect = await prisma.prospect.findUnique({ where: { id: targetId }, select: { id: true, promotedProjectId: true, deletedAt: true } });
    return { exists: Boolean(prospect && !prospect.deletedAt), projectId: prospect?.promotedProjectId };
  }
  if (targetType === "DOCUMENT") {
    const document = await prisma.document.findUnique({ where: { id: targetId }, select: { projectId: true, deletedAt: true } });
    return { exists: Boolean(document && !document.deletedAt), projectId: document?.projectId };
  }
  if (targetType === "DOCUMENT_VERSION") {
    const version = await prisma.documentVersion.findUnique({ where: { id: targetId }, select: { document: { select: { projectId: true, deletedAt: true } } } });
    return { exists: Boolean(version && !version.document.deletedAt), projectId: version?.document.projectId };
  }
  if (targetType === "SCENE") {
    const scene = await prisma.scene.findUnique({ where: { id: targetId }, select: { projectId: true } });
    return { exists: Boolean(scene), projectId: scene?.projectId };
  }
  if (targetType === "ENTITY") {
    const entity = await prisma.entity.findUnique({ where: { id: targetId }, select: { projectId: true } });
    return { exists: Boolean(entity), projectId: entity?.projectId };
  }
  if (targetType === "ASSET") {
    const asset = await prisma.asset.findUnique({ where: { id: targetId }, select: { projectId: true, deletedAt: true } });
    return { exists: Boolean(asset && !asset.deletedAt), projectId: asset?.projectId };
  }
  if (targetType === "TASK") {
    const task = await prisma.task.findUnique({ where: { id: targetId }, select: { projectId: true, deletedAt: true } });
    return { exists: Boolean(task && !task.deletedAt), projectId: task?.projectId };
  }
  if (targetType === "APPROVAL") {
    const approval = await prisma.hammerApproval.findUnique({ where: { id: targetId }, select: { projectId: true } });
    return { exists: Boolean(approval), projectId: approval?.projectId };
  }
  return { exists: false };
}

async function resolveTaskAssociation(body: ActionBody): Promise<ResolvedTaskAssociation> {
  const targetType = taskTargetField(body.targetType);
  const submittedProjectId = optionalString(body.projectId) ?? null;
  const submittedTargetId = optionalString(body.targetId) ?? null;
  if (targetType === "GENERAL") {
    if (submittedProjectId) {
      const project = await prisma.project.findUnique({ where: { id: submittedProjectId }, select: { id: true, deletedAt: true } });
      if (!project || project.deletedAt) return { valid: false, status: 404, error: "Project not found." };
    }
    return { valid: true, projectId: submittedProjectId, targetType, targetId: submittedTargetId };
  }
  if (targetType === "PROJECT") {
    const projectId = submittedTargetId || submittedProjectId;
    if (!projectId) return { valid: false, status: 400, error: "Project task target is required." };
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, deletedAt: true } });
    if (!project || project.deletedAt) return { valid: false, status: 404, error: "Project not found." };
    return { valid: true, projectId, targetType, targetId: projectId };
  }
  if (targetType === "PROJECT_LEAD") {
    const prospect = submittedTargetId ? await prisma.prospect.findUnique({ where: { id: submittedTargetId }, select: { id: true, deletedAt: true, promotedProjectId: true } }) : null;
    if (!prospect || prospect.deletedAt) return { valid: false, status: 404, error: "Prospect not found." };
    return { valid: true, projectId: prospect.promotedProjectId, targetType, targetId: prospect.id };
  }
  if (targetType === "DOCUMENT") {
    const document = submittedTargetId ? await prisma.document.findUnique({ where: { id: submittedTargetId }, select: { id: true, projectId: true, deletedAt: true } }) : null;
    if (!document || document.deletedAt) return { valid: false, status: 404, error: "Document not found." };
    return { valid: true, projectId: document.projectId, targetType, targetId: document.id };
  }
  if (targetType === "DOCUMENT_VERSION") {
    const version = submittedTargetId ? await prisma.documentVersion.findUnique({ where: { id: submittedTargetId }, select: { id: true, document: { select: { projectId: true, deletedAt: true } } } }) : null;
    if (!version || version.document.deletedAt) return { valid: false, status: 404, error: "Document version not found." };
    return { valid: true, projectId: version.document.projectId, targetType, targetId: version.id };
  }
  if (targetType === "ASSET") {
    const asset = submittedTargetId ? await prisma.asset.findUnique({ where: { id: submittedTargetId }, select: { id: true, projectId: true, deletedAt: true } }) : null;
    if (!asset || asset.deletedAt) return { valid: false, status: 404, error: "Asset not found." };
    return { valid: true, projectId: asset.projectId, targetType, targetId: asset.id };
  }
  if (targetType === "SCENE") {
    const scene = submittedTargetId ? await prisma.scene.findUnique({ where: { id: submittedTargetId }, select: { id: true, projectId: true } }) : null;
    if (!scene) return { valid: false, status: 404, error: "Scene not found." };
    return { valid: true, projectId: scene.projectId, targetType, targetId: scene.id };
  }
  if (targetType === "ENTITY") {
    const entity = submittedTargetId ? await prisma.entity.findUnique({ where: { id: submittedTargetId }, select: { id: true, projectId: true } }) : null;
    if (!entity) return { valid: false, status: 404, error: "Entity not found." };
    return { valid: true, projectId: entity.projectId, targetType, targetId: entity.id };
  }
  if (targetType === "APPROVAL") {
    const approval = submittedTargetId ? await prisma.hammerApproval.findUnique({ where: { id: submittedTargetId }, select: { id: true, projectId: true } }) : null;
    if (!approval) return { valid: false, status: 404, error: "Approval not found." };
    return { valid: true, projectId: approval.projectId, targetType, targetId: approval.id };
  }
  if (targetType === "CONTACT") {
    const contact = submittedTargetId ? await prisma.contact.findUnique({ where: { id: submittedTargetId }, select: { id: true, deletedAt: true } }) : null;
    if (!contact || contact.deletedAt) return { valid: false, status: 404, error: "Contact not found." };
    return { valid: true, projectId: submittedProjectId, targetType, targetId: contact.id };
  }
  return { valid: true, projectId: submittedProjectId, targetType, targetId: submittedTargetId };
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

function dateTimeString(date: Date) {
  return date.toISOString();
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function textField(value: unknown) {
  return typeof value === "string" ? value : "";
}

function optionalString(value: unknown) {
  const string = stringField(value);
  return string || undefined;
}

function optionalText(value: unknown) {
  const text = textField(value).trim();
  return text || undefined;
}

function stringArrayField(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)));
}

function noteMetadataField(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const noteType = stringField(record.noteType) || "GENERAL";
  const allowedTypes = new Set(["GENERAL", "COVERAGE", "CREATIVE", "LEGAL_RIGHTS", "PRODUCTION", "EXECUTIVE", "FOLLOW_UP"]);
  const tags = documentTagsField(record.tags).slice(0, 20);
  return {
    noteType: allowedTypes.has(noteType) ? noteType : "GENERAL",
    tags
  };
}

function documentTagsField(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const tags: Array<{ key: string; value: string }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const key = stringField(record.key).toLowerCase().replace(/\s+/g, " ").slice(0, 48);
    const tagValue = stringField(record.value).replace(/\s+/g, " ").slice(0, 160);
    if (!key || !tagValue) continue;
    const compound = `${key}:${tagValue.toLowerCase()}`;
    if (seen.has(compound)) continue;
    seen.add(compound);
    tags.push({ key, value: tagValue });
  }
  return tags.slice(0, 40);
}

function resolveProspectOwnerIds(lead: Record<string, unknown>, users: Array<{ id: string; name: string; email: string }>) {
  const submittedOwnerIds = stringArrayField(lead.ownerIds);
  const validUserIds = new Set(users.map((user) => user.id));
  const resolvedOwnerIds = submittedOwnerIds.filter((ownerId) => validUserIds.has(ownerId));
  const owner = optionalString(lead.owner);
  if (owner) {
    const ownerTokens = owner.split(/[;,/]+/).map((token) => token.trim().toLowerCase()).filter(Boolean);
    users.forEach((user) => {
      const userTokens = [user.id, user.name, user.email].map((value) => value.toLowerCase());
      if (ownerTokens.some((token) => userTokens.includes(token))) resolvedOwnerIds.push(user.id);
    });
  }
  return Array.from(new Set(resolvedOwnerIds));
}

function contactRelationshipTypeField(value: unknown): ContactRelationshipType {
  const relationshipType = stringField(value).toUpperCase();
  if (["AGENT", "MANAGER", "REPRESENTS", "WORKS_WITH", "ASSISTANT", "LEGAL_REP", "REFERRED_BY", "OTHER"].includes(relationshipType)) return relationshipType as ContactRelationshipType;
  return "OTHER";
}

function outreachEngagementTypeField(value: unknown): OutreachEngagementType {
  const engagementType = stringField(value).toUpperCase();
  if (["CALL", "MEETING", "EMAIL", "INTRO", "MATERIALS_SENT", "FOLLOW_UP", "NOTE", "OTHER"].includes(engagementType)) return engagementType as OutreachEngagementType;
  return "MEETING";
}

function commentTargetTypeField(value: unknown): CommentTargetType {
  const targetType = stringField(value).toUpperCase();
  if (["PROJECT", "PROSPECT", "DOCUMENT", "DOCUMENT_VERSION", "SCENE", "ENTITY", "ASSET", "TASK", "APPROVAL"].includes(targetType)) return targetType as CommentTargetType;
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

function nullableScore(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(1, Math.min(10, Math.round(number)));
}

function normalizeHumanCriteria(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    concept: nullableScore(record.concept),
    character: nullableScore(record.character),
    structure: nullableScore(record.structure),
    dialogue: nullableScore(record.dialogue),
    originality: nullableScore(record.originality),
    marketability: nullableScore(record.marketability),
    budgetFeasibility: nullableScore(record.budgetFeasibility),
    packagingPotential: nullableScore(record.packagingPotential)
  };
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
    owner: body.ownerIds !== undefined ? null : body.owner !== undefined ? optionalString(body.owner) : undefined,
    ownerIds: body.ownerIds !== undefined ? stringArrayField(body.ownerIds) : undefined,
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
    logline: body.logline !== undefined ? optionalString(body.logline) : undefined,
    creator: body.creator !== undefined ? optionalString(body.creator) : undefined,
    urgencyLabel: body.urgencyLabel !== undefined ? optionalString(body.urgencyLabel) : undefined,
    genre: body.genre !== undefined ? optionalString(body.genre) : undefined,
    priorityScore: body.priorityScore !== undefined ? optionalNumber(body.priorityScore) : undefined,
    owner: body.ownerIds !== undefined ? null : undefined,
    ownerIds: body.ownerIds !== undefined ? stringArrayField(body.ownerIds) : undefined
  };
}

function projectLeadCreate(body: Record<string, unknown>): Prisma.ProspectCreateInput {
  const externalId = optionalString(body.externalId);
  const ownerIds = stringArrayField(body.ownerIds);
  return {
    id: optionalString(body.id) ?? undefined,
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
    owner: ownerIds.length ? undefined : optionalString(body.owner),
    ownerIds,
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
  return value === "admin" || value === "executive" || value === "producer" || value === "artist" || value === "standard" || value === "department_lead" ? value : "standard";
}

function userRoleForAppRole(value: string): UserRole {
  if (value === "admin") return "ADMIN";
  if (value === "executive") return "EXECUTIVE";
  if (value === "artist") return "ARTIST";
  if (value === "standard") return "STANDARD";
  if (value === "department_lead") return "DEVELOPMENT";
  return "PRODUCER";
}

function hammerRoleForAppRole(value?: string) {
  if (value === "admin") return "ADMIN";
  if (value === "executive") return "EXECUTIVE";
  if (value === "producer") return "PRODUCER";
  if (value === "artist") return "ARTIST";
  if (value === "standard") return "STANDARD";
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
    projectIds: Array.isArray(contact.projectIds) ? contact.projectIds.filter((id): id is string => typeof id === "string") : [],
    isTalent: Boolean(contact.isTalent),
    talentAgency: optionalString(contact.talentAgency),
    talentCredits: optionalString(contact.talentCredits),
    talentGenre: optionalString(contact.talentGenre),
    talentRole: optionalString(contact.talentRole),
    talentMetWith: optionalString(contact.talentMetWith),
    talentBased: optionalString(contact.talentBased)
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

async function recordImportHistory(input: {
  importType: string;
  actorUserId?: string;
  actor?: string;
  rowsReceived?: number;
  rowsCreated?: number;
  rowsUpdated?: number;
  rowsRestored?: number;
  rowsSkipped?: number;
  status?: string;
  error?: string;
  detailJson?: Prisma.InputJsonValue;
}) {
  await prisma.importHistory.create({
    data: {
      importType: input.importType,
      actorUserId: input.actorUserId,
      actor: input.actor,
      rowsReceived: input.rowsReceived ?? 0,
      rowsCreated: input.rowsCreated ?? 0,
      rowsUpdated: input.rowsUpdated ?? 0,
      rowsRestored: input.rowsRestored ?? 0,
      rowsSkipped: input.rowsSkipped ?? 0,
      status: input.status ?? "COMPLETE",
      error: input.error,
      detailJson: input.detailJson
    }
  }).catch(() => undefined);
}
