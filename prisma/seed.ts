import { CommentTargetType, DocumentVersionStatus, PrismaClient, TaskTargetType } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { hammerApprovals, hammerAssets, hammerComments, hammerContacts, hammerDocuments, hammerEntities, hammerProjectMembers, hammerProjects, hammerScenes, hammerTasks, hammerUsers, hammerVersions, type HammerRole } from "../lib/hammer-data";

const prisma = new PrismaClient();

function toDbDocumentVersionStatus(status: string) {
  return Object.values(DocumentVersionStatus).includes(status as DocumentVersionStatus) ? status as DocumentVersionStatus : DocumentVersionStatus.DRAFT;
}

function toProjectRole(role: HammerRole) {
  if (role === "ADMIN") return "owner";
  if (role === "EXECUTIVE") return "executive";
  if (role === "PRODUCER") return "producer";
  if (role === "DEVELOPMENT" || role === "ARTIST" || role === "WRITER") return "department_lead";
  return "viewer";
}

function readProjectLeadCsv() {
  const path = join(process.cwd(), "prisma", "data", "projects-everything.csv");
  if (!existsSync(path)) return [];
  const rows = parseCsvRows(readFileSync(path, "utf8"));
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeCsvHeader);
  return rows.slice(1).map((row, index) => {
    const record = Object.fromEntries(headers.map((header, cellIndex) => [header, row[cellIndex]?.trim() ?? ""]));
    const externalId = record.projectid || undefined;
    return {
      id: externalId || `lead-${index + 1}`,
      title: record.title || "Untitled Slate Item",
      externalId,
      logline: optional(record.logline),
      genre: optional(record.genre),
      lane: optional(record.lane),
      creator: optional(record.creatorauthordirector),
      priorityScore: numeric(record.priorityscore),
      subgenreTags: optional(record.subgenretags),
      urgencyLabel: optional(record.urgencylabel),
      discoveryStage: optional(record.discoverystage),
      countryLanguage: optional(record.countrylanguage),
      platformSource: optional(record.platformsource),
      whyItMatters: optional(record.whyitmatters),
      signalProof: optional(record.signalproof),
      sourceLink: optional(record.sourcelink),
      rightsStatus: optional(record.rightsstatus),
      rightsHolder: optional(record.rightsholder),
      contactRep: optional(record.contactrep),
      adaptationFormat: optional(record.adaptationformat),
      comps: optional(record.comps),
      heatScore: numeric(record.heatscore),
      conceptScore: numeric(record.conceptscore),
      adaptabilityScore: numeric(record.adaptabilityscore),
      rightsOpportunityScore: numeric(record.rightsopportunityscore),
      studioFitScore: numeric(record.studiofitscore),
      nextActionStatus: optional(record.nextactionstatus),
      owner: optional(record.owner),
      nextStep: optional(record.nextstep),
      lastUpdated: optional(record.lastupdated),
      notes: optional(record.notes),
      projectCover: optional(record.projectcover),
      searchKeywords: optional(record.searchkeywords),
      originalReleaseDate: optional(record.originalreleasepublicationdate),
      myPicks: optional(record.mypicks),
      actionItems: optional(record.actionitems),
      country: optional(record.country),
      votes: numeric(record.votes),
      yearWritten: optional(record.yearwritten),
      scriptStatus: optional(record.scriptstatus),
      format: optional(record.format),
      scriptPdf: optional(record.scriptpdf)
    };
  });
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.trim()));
}

function normalizeCsvHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function optional(value?: string) {
  return value?.trim() || undefined;
}

function numeric(value?: string) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dateAtNoon(value?: string | null) {
  return value ? new Date(`${value}T12:00:00.000Z`) : undefined;
}

async function main() {
  for (const user of hammerUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        googleId: user.googleId,
        role: user.role,
        appRole: user.role === "ADMIN" ? "admin" : user.role === "EXECUTIVE" ? "executive" : "producer"
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        googleId: user.googleId,
        role: user.role,
        appRole: user.role === "ADMIN" ? "admin" : user.role === "EXECUTIVE" ? "executive" : "producer"
      }
    });
  }

  for (const project of hammerProjects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: {
        title: project.title,
        logline: project.logline,
        type: project.type,
        genre: project.genre,
        status: project.status,
        hammerStage: project.stage,
        ownerId: project.ownerId
      },
      create: {
        id: project.id,
        title: project.title,
        logline: project.logline,
        type: project.type,
        genre: project.genre,
        status: project.status,
        hammerStage: project.stage,
        ownerId: project.ownerId,
        codename: project.title,
        stage: project.stage
      }
    });
  }

  const slateRows = readProjectLeadCsv();
  for (const lead of slateRows) {
    await prisma.projectLead.upsert({
      where: { id: lead.id },
      update: lead,
      create: lead
    });
  }

  for (const membership of hammerProjectMembers) {
    await prisma.projectMembership.upsert({
      where: { projectId_userId: { projectId: membership.projectId, userId: membership.userId } },
      update: { role: toProjectRole(membership.role) },
      create: {
        projectId: membership.projectId,
        userId: membership.userId,
        role: toProjectRole(membership.role)
      }
    });
  }

  for (const contact of hammerContacts) {
    await prisma.contact.upsert({
      where: { id: contact.id },
      update: {
        name: contact.name,
        company: contact.company,
        type: contact.type,
        title: contact.title,
        email: contact.email,
        phone: contact.phone,
        location: contact.location,
        website: contact.website,
        status: contact.status ?? "ACTIVE",
        ownerId: contact.ownerId,
        tags: contact.tags ?? [],
        lastContacted: dateAtNoon(contact.lastContacted) ?? null,
        nextFollowUp: dateAtNoon(contact.nextFollowUp) ?? null,
        projectIds: contact.projectIds,
        notes: contact.notes
      },
      create: {
        id: contact.id,
        name: contact.name,
        company: contact.company,
        type: contact.type,
        title: contact.title,
        email: contact.email,
        phone: contact.phone,
        location: contact.location,
        website: contact.website,
        status: contact.status ?? "ACTIVE",
        ownerId: contact.ownerId,
        tags: contact.tags ?? [],
        lastContacted: dateAtNoon(contact.lastContacted) ?? null,
        nextFollowUp: dateAtNoon(contact.nextFollowUp) ?? null,
        projectIds: contact.projectIds,
        notes: contact.notes
      }
    });
  }

  const seededDocumentIds = new Set(hammerDocuments.map((document) => document.id));

  for (const document of hammerDocuments) {
    await prisma.document.upsert({
      where: { id: document.id },
      update: {
        projectId: document.projectId,
        title: document.title,
        type: document.type,
        createdById: document.createdById,
        writerName: document.writerName,
        source: document.source,
        contactId: document.contactId,
        submittedAt: dateAtNoon(document.submittedAt)
      },
      create: {
        id: document.id,
        projectId: document.projectId,
        title: document.title,
        type: document.type,
        createdById: document.createdById,
        writerName: document.writerName,
        source: document.source,
        contactId: document.contactId,
        submittedAt: dateAtNoon(document.submittedAt)
      }
    });
  }

  for (const version of hammerVersions.filter((version) => seededDocumentIds.has(version.documentId))) {
    const status = toDbDocumentVersionStatus(version.status);
    await prisma.documentVersion.upsert({
      where: { id: version.id },
      update: {
        status,
        extractedText: version.extractedText,
        notes: version.notes
      },
      create: {
        id: version.id,
        documentId: version.documentId,
        versionNumber: version.versionNumber,
        status,
        fileName: version.fileName,
        fileType: version.fileType,
        fileSize: version.fileSize,
        storagePath: version.storagePath,
        extractedText: version.extractedText,
        uploadedById: version.uploadedById,
        notes: version.notes
      }
    });
  }

  for (const document of hammerDocuments) {
    const currentVersionExists = hammerVersions.some((version) => version.id === document.currentVersionId && version.documentId === document.id);
    await prisma.document.update({
      where: { id: document.id },
      data: { currentVersionId: currentVersionExists ? document.currentVersionId : null }
    });
  }

  for (const scene of hammerScenes) {
    await prisma.scene.upsert({
      where: { id: scene.id },
      update: {
        heading: scene.heading,
        location: scene.location,
        timeOfDay: scene.timeOfDay,
        synopsis: scene.synopsis
      },
      create: {
        id: scene.id,
        projectId: scene.projectId,
        documentVersionId: scene.documentVersionId,
        sceneNumber: scene.sceneNumber,
        heading: scene.heading,
        location: scene.location,
        timeOfDay: scene.timeOfDay,
        synopsis: scene.synopsis,
        orderIndex: scene.orderIndex,
        number: scene.sceneNumber,
        slugline: scene.heading,
        summary: scene.synopsis
      }
    });
  }

  for (const entity of hammerEntities) {
    await prisma.entity.upsert({
      where: { projectId_type_name: { projectId: entity.projectId, type: entity.type, name: entity.name } },
      update: { description: entity.description },
      create: entity
    });
  }

  for (const asset of hammerAssets) {
    await prisma.asset.upsert({
      where: { id: asset.id },
      update: {
        title: asset.title,
        status: asset.status
      },
      create: asset
    });
  }

  for (const task of hammerTasks) {
    await prisma.task.upsert({
      where: { id: task.id },
      update: { status: task.status, priority: task.priority },
      create: {
        ...task,
        targetType: task.targetType as TaskTargetType,
        dueDate: dateAtNoon(task.dueDate)
      }
    });
  }

  for (const comment of hammerComments) {
    await prisma.comment.upsert({
      where: { id: comment.id },
      update: { body: comment.body, status: comment.status },
      create: {
        ...comment,
        targetType: comment.targetType as CommentTargetType,
        createdAt: dateAtNoon(comment.createdAt)
      }
    });
  }

  for (const approval of hammerApprovals) {
    await prisma.hammerApproval.upsert({
      where: { id: approval.id },
      update: { status: approval.status, decisionNotes: approval.decisionNotes },
      create: {
        ...approval,
        targetType: approval.targetType as CommentTargetType,
        createdAt: dateAtNoon(approval.createdAt),
        decidedAt: dateAtNoon(approval.decidedAt)
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
