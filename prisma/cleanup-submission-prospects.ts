import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");

const syncedAirtableTables = ["Projects", "Public IP", "Cultural Trends"];

const submissionProspectWhere: Prisma.ProspectWhereInput = {
  promotedProjectId: null,
  OR: [
    { airtableTableName: null },
    { airtableTableName: "" },
    { airtableTableName: { notIn: syncedAirtableTables } }
  ]
};

async function main() {
  const prospects = await prisma.prospect.findMany({
    where: submissionProspectWhere,
    select: { id: true, title: true, creator: true, airtableTableName: true, lane: true },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }]
  });

  console.log(`Submission/manual prospects matched: ${prospects.length}`);
  console.table(prospects.slice(0, 25).map((prospect) => ({
    id: prospect.id,
    title: prospect.title,
    creator: prospect.creator ?? "",
    source: prospect.airtableTableName ?? prospect.lane ?? "Manual"
  })));
  if (prospects.length > 25) console.log(`...and ${prospects.length - 25} more`);

  if (!execute) {
    console.log("Dry run only. Re-run with --execute to delete these submission/manual prospects.");
    return;
  }

  const prospectIds = prospects.map((prospect) => prospect.id);
  if (!prospectIds.length) {
    console.log("Nothing to delete.");
    return;
  }

  await prisma.$transaction([
    prisma.slateCollectionItem.deleteMany({ where: { prospectId: { in: prospectIds } } }),
    prisma.prospectAsset.deleteMany({ where: { prospectId: { in: prospectIds } } }),
    prisma.prospect.deleteMany({ where: { id: { in: prospectIds } } })
  ]);

  console.log(`Deleted ${prospectIds.length} submission/manual prospect row${prospectIds.length === 1 ? "" : "s"}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
