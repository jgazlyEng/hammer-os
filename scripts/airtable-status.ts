import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const [{ getAirtableProspectStatus }, { prisma }] = await Promise.all([
    import("../lib/airtable-sync"),
    import("../lib/db")
  ]);
  try {
    const status = await getAirtableProspectStatus(prisma);
    console.log(JSON.stringify(status, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
