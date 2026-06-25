# Hammer OS Deployment

## Local Development

1. Copy `.env.example` to `.env`.
2. Fill Google OAuth and GCS values, or leave them blank for local password/demo fallback.
3. Start Postgres and the app:

```bash
docker compose up --build
```

The app runs at `http://localhost:3000`. The compose command applies the Prisma schema and seeds sample Hammer OS data.

## Google OAuth

Create an OAuth client in Google Cloud Console and add:

```text
http://localhost:3000/api/auth/google/callback
https://YOUR_DOMAIN/api/auth/google/callback
```

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and `SESSION_SECRET`.

## Google Cloud Storage

Create a private bucket. Grant the service account object read/write permissions. Set:

```text
GCS_BUCKET_NAME
GCS_PROJECT_ID
GCS_CLIENT_EMAIL
GCS_PRIVATE_KEY
UPLOAD_STORAGE_DRIVER=gcs
```

Files are stored under:

```text
projects/{projectId}/documents/{documentId}/versions/{versionId}/{fileName}
projects/{projectId}/assets/{assetId}/original/{fileName}
projects/{projectId}/assets/{assetId}/thumbnails/{fileName}
projects/{projectId}/business/{documentId}/{fileName}
```

Objects remain private; the app generates short-lived signed URLs.

## GCE VM Production Sketch

1. Provision a Google Compute Engine VM with Docker installed.
2. Point DNS at the VM and install nginx using the included `nginx.conf`.
3. Copy the app folder and production `.env` to the VM.
4. Use Cloud SQL Postgres or a local Postgres container. Set `DATABASE_URL` accordingly.
5. Build and start:

```bash
docker compose up --build -d
```

6. Run migrations with `npx prisma migrate deploy` once migrations are checked in. For MVP bootstrap, `npx prisma db push && npm run db:seed` is acceptable.

For HTTPS, put a managed load balancer in front of the VM or install Certbot on the VM and update nginx to listen on 443.
