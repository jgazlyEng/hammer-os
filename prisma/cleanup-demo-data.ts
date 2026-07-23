import { PrismaClient } from "@prisma/client";
import {
  hammerApprovals,
  hammerAssets,
  hammerComments,
  hammerContacts,
  hammerDocuments,
  hammerEntities,
  hammerProjectMembers,
  hammerProjects,
  hammerScenes,
  hammerTasks,
  hammerUsers,
  hammerVersions
} from "../lib/hammer-data";

const prisma = new PrismaClient();

const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
const includeDemoUsers = args.has("--include-demo-users");
const includeImportedProspects = args.has("--include-imported-prospects");

const ids = {
  approvals: hammerApprovals.map((item) => item.id),
  assets: hammerAssets.map((item) => item.id),
  comments: hammerComments.map((item) => item.id),
  contacts: hammerContacts.map((item) => item.id),
  documents: hammerDocuments.map((item) => item.id),
  documentVersions: hammerVersions.map((item) => item.id),
  entities: hammerEntities.map((item) => item.id),
  projects: hammerProjects.map((item) => item.id),
  projectMembers: hammerProjectMembers.map((item) => item.id),
  scenes: hammerScenes.map((item) => item.id),
  tasks: hammerTasks.map((item) => item.id),
  users: hammerUsers.map((item) => item.id)
};

async function countDemoRows() {
  const [
    approvals,
    assets,
    comments,
    contacts,
    documents,
    documentVersions,
    entities,
    projects,
    projectMembershipsByKey,
    scenes,
    tasks,
    users,
    importedProspects
  ] = await Promise.all([
    prisma.hammerApproval.count({ where: { id: { in: ids.approvals } } }),
    prisma.asset.count({ where: { id: { in: ids.assets } } }),
    prisma.comment.count({ where: { id: { in: ids.comments } } }),
    prisma.contact.count({ where: { id: { in: ids.contacts } } }),
    prisma.document.count({ where: { id: { in: ids.documents } } }),
    prisma.documentVersion.count({ where: { id: { in: ids.documentVersions } } }),
    prisma.entity.count({ where: { id: { in: ids.entities } } }),
    prisma.project.count({ where: { id: { in: ids.projects } } }),
    prisma.projectMembership.count({
      where: {
        OR: hammerProjectMembers.map((member) => ({
          projectId: member.projectId,
          userId: member.userId
        }))
      }
    }),
    prisma.scene.count({ where: { id: { in: ids.scenes } } }),
    prisma.task.count({ where: { id: { in: ids.tasks } } }),
    prisma.user.count({ where: { id: { in: ids.users } } }),
    prisma.prospect.count({ where: { id: { startsWith: "lead-" } } })
  ]);

  return {
    approvals,
    assets,
    comments,
    contacts,
    documents,
    documentVersions,
    entities,
    projects,
    projectMembershipsByKey,
    scenes,
    tasks,
    users: includeDemoUsers ? users : 0,
    importedProspects: includeImportedProspects ? importedProspects : 0
  };
}

async function deleteDemoRows() {
  return prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({
      where: {
        OR: [
          { entityId: { in: [...ids.projects, ...ids.documents, ...ids.documentVersions, ...ids.assets, ...ids.tasks, ...ids.contacts] } },
          { actorUserId: { in: ids.users } }
        ]
      }
    });
    await tx.auditEvent.deleteMany({
      where: {
        OR: [
          { targetId: { in: [...ids.projects, ...ids.documents, ...ids.documentVersions, ...ids.assets, ...ids.tasks, ...ids.contacts] } },
          { actorUserId: { in: ids.users } }
        ]
      }
    });
    await tx.comment.deleteMany({
      where: {
        OR: [
          { id: { in: ids.comments } },
          { targetId: { in: [...ids.projects, ...ids.documents, ...ids.documentVersions, ...ids.assets, ...ids.tasks] } },
          { createdById: { in: ids.users } }
        ]
      }
    });
    await tx.hammerApproval.deleteMany({
      where: {
        OR: [
          { id: { in: ids.approvals } },
          { targetId: { in: [...ids.documents, ...ids.documentVersions, ...ids.assets] } },
          { projectId: { in: ids.projects } }
        ]
      }
    });
    await tx.task.deleteMany({
      where: {
        OR: [
          { id: { in: ids.tasks } },
          { projectId: { in: ids.projects } },
          { targetId: { in: [...ids.projects, ...ids.documents, ...ids.documentVersions, ...ids.assets] } }
        ]
      }
    });
    await tx.assetLink.deleteMany({ where: { OR: [{ assetId: { in: ids.assets } }, { projectId: { in: ids.projects } }] } });
    await tx.asset.deleteMany({ where: { OR: [{ id: { in: ids.assets } }, { projectId: { in: ids.projects } }] } });
    await tx.sceneEntity.deleteMany({ where: { OR: [{ sceneId: { in: ids.scenes } }, { entityId: { in: ids.entities } }] } });
    await tx.entity.deleteMany({ where: { OR: [{ id: { in: ids.entities } }, { projectId: { in: ids.projects } }] } });
    await tx.scene.deleteMany({ where: { OR: [{ id: { in: ids.scenes } }, { projectId: { in: ids.projects } }] } });
    await tx.document.updateMany({ where: { id: { in: ids.documents } }, data: { currentVersionId: null } });
    await tx.documentDiff.deleteMany({ where: { documentId: { in: ids.documents } } });
    await tx.supportingDocument.deleteMany({ where: { OR: [{ scriptDocumentId: { in: ids.documents } }, { projectId: { in: ids.projects } }] } });
    await tx.documentVersion.deleteMany({ where: { OR: [{ id: { in: ids.documentVersions } }, { documentId: { in: ids.documents } }] } });
    await tx.scriptCollectionItem.deleteMany({ where: { documentId: { in: ids.documents } } });
    await tx.document.deleteMany({ where: { id: { in: ids.documents } } });
    await tx.projectMembership.deleteMany({
      where: {
        OR: [
          { projectId: { in: ids.projects } },
          ...hammerProjectMembers.map((member) => ({ projectId: member.projectId, userId: member.userId }))
        ]
      }
    });
    await tx.project.deleteMany({ where: { id: { in: ids.projects } } });
    await tx.contactRelationship.deleteMany({
      where: { OR: [{ fromContactId: { in: ids.contacts } }, { toContactId: { in: ids.contacts } }] }
    });
    await tx.contact.deleteMany({ where: { id: { in: ids.contacts } } });

    if (includeImportedProspects) {
      await tx.slateCollectionItem.deleteMany({ where: { prospectId: { startsWith: "lead-" } } });
      await tx.prospectAsset.deleteMany({ where: { prospectId: { startsWith: "lead-" } } });
      await tx.prospect.deleteMany({ where: { id: { startsWith: "lead-" } } });
    }

    if (includeDemoUsers) {
      await tx.scriptCollection.deleteMany({ where: { ownerId: { in: ids.users } } });
      await tx.slateCollection.deleteMany({ where: { ownerId: { in: ids.users } } });
      await tx.user.deleteMany({ where: { id: { in: ids.users } } });
    }
  });
}

async function main() {
  const before = await countDemoRows();
  console.log("Demo cleanup target counts:");
  console.table(before);

  if (!execute) {
    console.log("Dry run only. Re-run with --execute to delete these rows.");
    console.log("Optional flags: --include-demo-users, --include-imported-prospects");
    return;
  }

  await deleteDemoRows();
  const after = await countDemoRows();
  console.log("Cleanup complete. Remaining target counts:");
  console.table(after);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
