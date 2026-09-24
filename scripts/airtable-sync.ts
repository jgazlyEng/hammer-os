import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const [{ syncAirtableProspects }, { prisma }] = await Promise.all([
    import("../lib/airtable-sync"),
    import("../lib/db")
  ]);
  try {
    const summary = await syncAirtableProspects(prisma);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
