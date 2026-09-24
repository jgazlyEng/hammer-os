import type { PrismaClient, Prisma } from "@prisma/client";

const DEFAULT_BASE_ID = "appKCINmEMPpqkwqt";
const DEFAULT_TABLES = ["Projects", "Cultural Trends", "Public IP"];

type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
};

type AirtableListResponse = {
  records?: AirtableRecord[];
  offset?: string;
  error?: { type?: string; message?: string };
};

export type AirtableSyncSummary = {
  baseId: string;
  tables: Array<{
    tableName: string;
    received: number;
    created: number;
    updated: number;
  }>;
  totalReceived: number;
  totalCreated: number;
  totalUpdated: number;
};

export function airtableSyncConfig() {
  return {
    baseId: process.env.AIRTABLE_BASE_ID?.trim() || DEFAULT_BASE_ID,
    apiKey: process.env.AIRTABLE_API_KEY?.trim() || process.env.AIRTABLE_PAT?.trim() || "",
    tables: parseTableList(process.env.AIRTABLE_SYNC_TABLES),
    secret: process.env.AIRTABLE_SYNC_SECRET?.trim() || ""
  };
}

export async function syncAirtableProspects(prisma: PrismaClient): Promise<AirtableSyncSummary> {
  const config = airtableSyncConfig();
  if (!config.apiKey) {
    throw new Error("Airtable sync is missing AIRTABLE_API_KEY or AIRTABLE_PAT.");
  }

  const summary: AirtableSyncSummary = {
    baseId: config.baseId,
    tables: [],
    totalReceived: 0,
    totalCreated: 0,
    totalUpdated: 0
  };

  for (const tableName of config.tables) {
    const records = await fetchAirtableRecords(config.baseId, tableName, config.apiKey);
    let created = 0;
    let updated = 0;

    for (const record of records) {
      const existing = await prisma.prospect.findUnique({
        where: {
          airtableBaseId_airtableTableName_airtableRecordId: {
            airtableBaseId: config.baseId,
            airtableTableName: tableName,
            airtableRecordId: record.id
          }
        },
        select: { id: true }
      });
      const data = airtableRecordToProspectData(config.baseId, tableName, record);
      await prisma.prospect.upsert({
        where: {
          airtableBaseId_airtableTableName_airtableRecordId: {
            airtableBaseId: config.baseId,
            airtableTableName: tableName,
            airtableRecordId: record.id
          }
        },
        create: data,
        update: {
          ...data,
          id: undefined,
          createdAt: undefined
        }
      });
      if (existing) updated += 1;
      else created += 1;
    }

    summary.tables.push({ tableName, received: records.length, created, updated });
    summary.totalReceived += records.length;
    summary.totalCreated += created;
    summary.totalUpdated += updated;
  }

  return summary;
}

async function fetchAirtableRecords(baseId: string, tableName: string, apiKey: string) {
  const records: AirtableRecord[] = [];
  let offset = "";

  do {
    const url = new URL(`https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      },
      cache: "no-store"
    });
    const payload = await response.json().catch(() => ({})) as AirtableListResponse;
    if (!response.ok) {
      const message = payload.error?.message || response.statusText || "Airtable request failed.";
      throw new Error(`Airtable sync failed for ${tableName}: ${message}`);
    }

    records.push(...(payload.records ?? []));
    offset = payload.offset ?? "";
  } while (offset);

  return records;
}

function airtableRecordToProspectData(baseId: string, tableName: string, record: AirtableRecord): Prisma.ProspectCreateInput {
  const fields = normalizeFields(record.fields);
  const title = stringFromAliases(fields, [
    "title",
    "name",
    "project",
    "project name",
    "ip",
    "property",
    "trend",
    "cultural trend"
  ]) || firstUsefulString(record.fields) || record.id;

  return {
    title,
    externalId: record.id,
    logline: stringFromAliases(fields, ["logline", "description", "summary", "premise", "notes", "overview"]),
    genre: stringFromAliases(fields, ["genre", "genres", "category", "categories"]),
    lane: tableName,
    creator: stringFromAliases(fields, ["creator", "writer", "author", "source", "submitted by"]),
    priorityScore: numberFromAliases(fields, ["priority score", "score", "rating"]),
    subgenreTags: stringFromAliases(fields, ["subgenre", "subgenres", "tags"]),
    urgencyLabel: stringFromAliases(fields, ["urgency", "priority"]),
    discoveryStage: stringFromAliases(fields, ["stage", "discovery stage", "status"]),
    countryLanguage: stringFromAliases(fields, ["country/language", "language", "country language"]),
    platformSource: stringFromAliases(fields, ["platform", "source", "outlet", "where found"]),
    whyItMatters: stringFromAliases(fields, ["why it matters", "why", "rationale"]),
    signalProof: stringFromAliases(fields, ["signal proof", "proof", "evidence"]),
    sourceLink: stringFromAliases(fields, ["url", "link", "source link", "reference", "article"]),
    rightsStatus: stringFromAliases(fields, ["rights", "rights status", "availability"]),
    rightsHolder: stringFromAliases(fields, ["rights holder", "owner", "copyright holder"]),
    contactRep: stringFromAliases(fields, ["contact", "rep", "representative", "agent", "manager"]),
    adaptationFormat: stringFromAliases(fields, ["adaptation format", "format", "medium"]),
    comps: stringFromAliases(fields, ["comps", "comparables", "references"]),
    nextActionStatus: stringFromAliases(fields, ["next action", "next step", "next steps", "action", "follow up"]),
    owner: stringFromAliases(fields, ["greenlight owner", "internal owner", "owner"]),
    lastUpdated: stringFromAliases(fields, ["last updated", "updated", "modified"]),
    notes: stringFromAliases(fields, ["internal notes", "notes"]),
    searchKeywords: buildSearchKeywords(record.fields),
    myPicks: stringFromAliases(fields, ["my picks", "pick"]),
    actionItems: stringFromAliases(fields, ["action items", "actions"]),
    country: stringFromAliases(fields, ["country", "territory"]),
    votes: numberFromAliases(fields, ["votes"]),
    yearWritten: stringFromAliases(fields, ["year", "year written", "release year"]),
    scriptStatus: stringFromAliases(fields, ["script status", "read status"]),
    format: stringFromAliases(fields, ["format", "type"]),
    scriptPdf: stringFromAliases(fields, ["script pdf", "pdf", "file"]),
    airtableBaseId: baseId,
    airtableTableName: tableName,
    airtableRecordId: record.id,
    airtableCreatedTime: parseDate(record.createdTime),
    airtableLastSyncedAt: new Date(),
    airtableFieldsJson: record.fields as Prisma.InputJsonValue,
    deletedAt: null
  };
}

function parseTableList(value?: string) {
  const tables = value?.split(",").map((table) => table.trim()).filter(Boolean);
  return tables?.length ? tables : DEFAULT_TABLES;
}

function normalizeFields(fields: Record<string, unknown>) {
  const normalized = new Map<string, unknown>();
  for (const [key, value] of Object.entries(fields)) {
    normalized.set(normalizeFieldKey(key), value);
  }
  return normalized;
}

function normalizeFieldKey(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function stringFromAliases(fields: Map<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    const value = fields.get(normalizeFieldKey(alias));
    const normalized = stringifyAirtableValue(value);
    if (normalized) return normalized;
  }
  return undefined;
}

function numberFromAliases(fields: Map<string, unknown>, aliases: string[]) {
  const value = stringFromAliases(fields, aliases);
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function stringifyAirtableValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const values = value.map((entry) => {
      if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") return String(entry);
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        return stringifyAirtableValue(record.name ?? record.filename ?? record.url ?? record.email ?? record.id);
      }
      return undefined;
    }).filter(Boolean);
    return values.length ? values.join(", ") : undefined;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return stringifyAirtableValue(record.name ?? record.filename ?? record.url ?? record.email ?? record.id);
  }
  return undefined;
}

function firstUsefulString(fields: Record<string, unknown>) {
  for (const value of Object.values(fields)) {
    const normalized = stringifyAirtableValue(value);
    if (normalized) return normalized;
  }
  return undefined;
}

function buildSearchKeywords(fields: Record<string, unknown>) {
  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${stringifyAirtableValue(value) ?? ""}`.trim())
    .filter((value) => value.length > 2)
    .join("\n")
    .slice(0, 20000) || undefined;
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
