import { PrismaClient, type Prospect } from "@prisma/client";

const prisma = new PrismaClient();
const execute = process.argv.includes("--execute");

type ProspectWithCounts = Prospect & {
  _count: {
    assets: number;
    collectionItems: number;
  };
};

async function main() {
  const prospects = await prisma.prospect.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: {
          assets: true,
          collectionItems: true
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
  const groups = duplicateGroups(prospects);
  const duplicateCount = groups.reduce((total, group) => total + group.items.length - 1, 0);

  console.log(`Prospects scanned: ${prospects.length}`);
  console.log(`Duplicate groups: ${groups.length}`);
  console.log(`Duplicate rows ${execute ? "to merge" : "found"}: ${duplicateCount}`);

  for (const group of groups.slice(0, 25)) {
    const keeper = chooseKeeper(group.items);
    const duplicates = group.items.filter((item) => item.id !== keeper.id);
    console.log(`\n${group.key}`);
    console.log(`  keep: ${keeper.id} | ${keeper.title} | externalId=${keeper.externalId ?? "-"}`);
    for (const duplicate of duplicates) {
      console.log(`  dupe: ${duplicate.id} | ${duplicate.title} | externalId=${duplicate.externalId ?? "-"}`);
    }
  }

  if (!execute) {
    console.log("\nDry run only. Re-run with --execute to merge duplicate prospect rows.");
    return;
  }

  for (const group of groups) {
    const keeper = chooseKeeper(group.items);
    const duplicates = group.items.filter((item) => item.id !== keeper.id);
    for (const duplicate of duplicates) {
      await mergeDuplicateProspect(duplicate.id, keeper.id);
    }
  }

  const remaining = duplicateGroups(await prisma.prospect.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { assets: true, collectionItems: true } } }
  }));
  console.log(`\nMerge complete. Remaining duplicate groups: ${remaining.length}`);
}

function duplicateGroups(prospects: ProspectWithCounts[]) {
  const byKey = new Map<string, ProspectWithCounts[]>();
  for (const prospect of prospects) {
    const key = prospectKey(prospect);
    const group = byKey.get(key) ?? [];
    group.push(prospect);
    byKey.set(key, group);
  }
  return Array.from(byKey.entries())
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({ key, items }));
}

function chooseKeeper(items: ProspectWithCounts[]) {
  return [...items].sort((left, right) => prospectScore(right) - prospectScore(left))[0];
}

function prospectScore(prospect: ProspectWithCounts) {
  let score = prospect.updatedAt.getTime();
  if (prospect.promotedProjectId) score += 10_000_000_000_000;
  score += prospect._count.assets * 1_000_000;
  score += prospect._count.collectionItems * 100_000;
  if (prospect.scriptPdf) score += 10_000;
  if (prospect.notes) score += 1_000;
  return score;
}

async function mergeDuplicateProspect(duplicateId: string, keeperId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.prospectAsset.updateMany({
      where: { prospectId: duplicateId },
      data: { prospectId: keeperId }
    });

    const duplicateItems = await tx.slateCollectionItem.findMany({
      where: { prospectId: duplicateId }
    });
    for (const item of duplicateItems) {
      const existingKeeperItem = await tx.slateCollectionItem.findFirst({
        where: {
          collectionId: item.collectionId,
          itemType: item.itemType,
          prospectId: keeperId
        }
      });
      if (existingKeeperItem) {
        await tx.slateCollectionItem.delete({ where: { id: item.id } });
      } else {
        await tx.slateCollectionItem.update({
          where: { id: item.id },
          data: { prospectId: keeperId }
        });
      }
    }

    await tx.prospect.update({
      where: { id: duplicateId },
      data: { deletedAt: new Date() }
    });
  });
}

function prospectKey(prospect: Pick<Prospect, "externalId" | "title" | "creator" | "sourceLink" | "logline">) {
  const externalId = normalizeKeyPart(prospect.externalId);
  if (externalId) return `external:${externalId}`;
  return [
    "natural",
    normalizeKeyPart(prospect.title),
    normalizeKeyPart(prospect.creator),
    normalizeKeyPart(prospect.sourceLink),
    normalizeKeyPart(prospect.logline)
  ].join(":");
}

function normalizeKeyPart(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 180);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
