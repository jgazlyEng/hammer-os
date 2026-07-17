# GreenLight CSV Import Templates

These templates match the CSV import fields currently supported by GreenLight.

## Contacts

Template:

- `greenlight_contacts_import_template.csv`

Import location:

- Contacts page
- Click `Import CSV`

Required field:

- `name`

Recommended fields:

- `company`
- `type`
- `title`
- `email`
- `phone`
- `status`
- `ownerId`
- `tags`
- `nextFollowUp`
- `projects`
- `notes`

Accepted `type` values:

- `WRITER`
- `PRODUCER`
- `ARTIST`
- `EXECUTIVE`
- `AGENCY`
- `MANAGEMENT`
- `LEGAL`
- `VENDOR`
- `OTHER`

Accepted `status` values:

- `NEW`
- `ACTIVE`
- `FOLLOW_UP`
- `WAITING`
- `DO_NOT_CONTACT`
- `ARCHIVED`

Date format:

- Use `YYYY-MM-DD`, for example `2026-07-22`.

Tags:

- Separate tags with semicolons or commas.
- Example: `feature; thriller; agency`

Projects:

- Separate project names or project IDs with semicolons.
- Example: `Project Hammer; Evil Building`

Owner:

- `ownerId` is best when you know the GreenLight user ID.
- If you do not know the user ID, leave it blank and assign the owner inside GreenLight.

## Development Slate

Template:

- `greenlight_development_slate_import_template.csv`

Import location:

- Projects page
- Select `Development Slate`
- Click `Import CSV`

Important duplicate behavior:

- `Project ID` maps to GreenLight's external slate ID.
- If a later upload contains the same `Project ID`, GreenLight skips that row instead of creating a duplicate.
- For repeat Airtable dumps, keep the Airtable record ID in `Project ID`.

Recommended minimum fields:

- `Project ID`
- `Title`
- `Logline`
- `Genre`
- `Lane`
- `Creator / Author / Director`
- `Urgency Label`
- `Rights Status`
- `Contact Rep`
- `Next Action Status`
- `Owner`
- `Next Step`
- `Script Status`
- `Format`

Numeric fields:

- `Priority Score`
- `Heat Score`
- `Concept Score`
- `Adaptability Score`
- `Rights Opportunity Score`
- `Studio Fit Score`
- `Votes`

Date-like fields:

- `Last Updated`
- `Original Release / Publication Date`

These are stored as text in the slate, so `YYYY-MM-DD` is recommended but not strictly required.

## Notes

- Keep the header row unchanged.
- CSV files should be UTF-8.
- Wrap long text fields in quotes, especially loglines, notes, comps, and action items.
- Do not use line breaks inside cells unless you have confirmed your spreadsheet app exports them cleanly.
- In production, imports write to the database through GreenLight's workspace API.

