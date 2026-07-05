import { CommentTargetType, DocumentVersionStatus, PrismaClient, TaskTargetType } from "@prisma/client";
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
        submittedAt: document.submittedAt ? new Date(`${document.submittedAt}T12:00:00.000Z`) : undefined
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
        submittedAt: document.submittedAt ? new Date(`${document.submittedAt}T12:00:00.000Z`) : undefined
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
    await prisma.document.update({
      where: { id: document.id },
      data: { currentVersionId: document.currentVersionId }
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
        dueDate: new Date(`${task.dueDate}T12:00:00.000Z`)
      }
    });
  }

  for (const comment of hammerComments) {
    await prisma.comment.upsert({
      where: { id: comment.id },
      update: { body: comment.body, status: comment.status },
      create: {
        ...comment,
        targetType: comment.targetType as CommentTargetType
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
        decidedAt: approval.decidedAt ? new Date(`${approval.decidedAt}T12:00:00.000Z`) : undefined
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
