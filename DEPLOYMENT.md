# Hammer OS Deployment

## Local Development

1. Copy `.env.example` to `.env`.
2. Fill database, password login, and storage values.
3. Start Postgres and the app:

```bash
docker compose up --build
```

The app runs at `http://localhost:3000`. The compose command applies the Prisma schema and seeds sample Hammer OS data.

## Password Login

For the first production launch, GreenLight uses email/password sessions. Set:

```text
DATABASE_URL
NEXTAUTH_URL
SESSION_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD
```

`NEXTAUTH_URL` can be `http://EXTERNAL_IP` for the temporary VM launch. Once you move to HTTPS, update it to `https://YOUR_DOMAIN`.

`SESSION_SECRET` should be a long random value and must not be blank in production. The bootstrap admin is created on first successful login with `ADMIN_EMAIL` and `ADMIN_PASSWORD` if that user does not already exist.

Google OAuth can be added later after a domain and HTTPS are in place.

## Google Cloud Storage

Create a private bucket. Grant the service account object read/write permissions. Set:

```text
GCS_BUCKET_NAME
GCS_PROJECT_ID
GCS_CLIENT_EMAIL
GCS_PRIVATE_KEY
UPLOAD_STORAGE_DRIVER=gcs
GCS_UPLOAD_BUCKET
```

`GCS_UPLOAD_BUCKET` can match `GCS_BUCKET_NAME`; the app accepts either for server-side script uploads.

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
