# Airtable Prospects Sync

GreenLight can pull Prospects data from Airtable into the production database. The first supported base is:

- Base ID: `appKCINmEMPpqkwqt`
- Synced tables: `Projects`, `Cultural Trends`, `Public IP`

The Airtable token is server-only. Never place it in frontend code.

## Environment Variables

Set these in the app server `.env`:

```bash
AIRTABLE_API_KEY="your_airtable_personal_access_token"
AIRTABLE_BASE_ID="appKCINmEMPpqkwqt"
AIRTABLE_SYNC_TABLES="Projects,Cultural Trends,Public IP"
# Optional only if a future Airtable setup uses one source table with multiple views:
# AIRTABLE_SOURCE_TABLE="tblXXXXXXXXXXXXXX"
# AIRTABLE_SYNC_VIEWS="Projects=viwXXXXXXXXXXXXXX,Public IP=viwYYYYYYYYYYYYYY,Cultural Trends=viwZZZZZZZZZZZZZZ"
AIRTABLE_SYNC_SECRET="use-a-long-random-secret-for-scheduler-calls"
```

## Manual Sync

From the app server:

```bash
npm run airtable:status
npm run airtable:inspect
npm run airtable:sync
npm run airtable:status
```

`airtable:status` confirms whether the Airtable token is present and shows how many Prospect rows exist under each Airtable table.
`airtable:inspect` lists Airtable table IDs when the token includes `schema.bases:read`.

Or trigger the protected API endpoint:

```bash
curl -X POST "https://greenlight.hammerstudiosinc.com/api/admin/airtable-sync" \
  -H "Authorization: Bearer $AIRTABLE_SYNC_SECRET"
```

## Recurring Sync In GCP

Use Cloud Scheduler to call the protected sync endpoint on a cadence such as every 15 minutes:

```bash
gcloud scheduler jobs create http greenlight-airtable-sync \
  --schedule="*/15 * * * *" \
  --uri="https://greenlight.hammerstudiosinc.com/api/admin/airtable-sync" \
  --http-method=POST \
  --headers="Authorization=Bearer YOUR_AIRTABLE_SYNC_SECRET" \
  --time-zone="America/Los_Angeles"
```

## Data Behavior

- Airtable rows are upserted into `Prospect`.
- Airtable identity is stored using base ID, table name, and record ID so the GreenLight tabs can mirror Airtable's tables.
- Airtable fields are also preserved as raw JSON in `airtableFieldsJson`.
- Local GreenLight assets, notes, and collections remain attached to the Prospect row.
- Missing Airtable rows are not deleted automatically. This prevents accidental data loss during Airtable view/filter changes.
