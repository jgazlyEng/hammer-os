# Hammer Production Tracker: GCP VM Deployment

This app is now set up for a shared deployment with:

- Next.js app server
- MySQL database via Prisma
- Local VM or Google Cloud Storage for uploaded scripts
- Signed cookie authentication with project memberships
- API routes for project CRUD and script upload/parsing
- Audit log table for production-history events

## 1. VM Basics

Recommended starting VM:

- Ubuntu 22.04 LTS
- e2-standard-2 or larger
- 30GB+ persistent disk
- Static external IP
- Firewall rule allowing TCP `80` and `443`
- SSH restricted to your IPs if possible

## 2. Install Runtime

```bash
sudo apt update
sudo apt install -y mysql-server nginx git build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 3. Create MySQL Database

```bash
sudo mysql
```

```sql
CREATE DATABASE hammer_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hammer_user'@'localhost' IDENTIFIED BY 'replace_with_strong_password';
GRANT ALL PRIVILEGES ON hammer_tracker.* TO 'hammer_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 4. Configure Environment

Create `.env` in the project root:

```bash
DATABASE_URL="mysql://hammer_user:replace_with_strong_password@127.0.0.1:3306/hammer_tracker"
SESSION_SECRET="replace_with_a_long_random_secret"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="replace_with_a_strong_bootstrap_password"
UPLOAD_STORAGE_DRIVER="local"
UPLOAD_DIR="/var/hammer-production-tracker/uploads"
```

Create the upload directory:

```bash
sudo mkdir -p /var/hammer-production-tracker/uploads
sudo chown -R $USER:$USER /var/hammer-production-tracker
```

For Cloud Storage uploads instead of VM disk:

```bash
UPLOAD_STORAGE_DRIVER="gcs"
GCS_UPLOAD_BUCKET="your-hammer-script-upload-bucket"
```

The VM service account needs permission to write objects to that bucket.

## 5. Install, Generate, Migrate

```bash
npm install
npm run db:generate
npm run db:push
npm run build
```

Use `db:push` for the first MVP deployment. When schema changes become more formal, switch to:

```bash
npm run db:migrate
```

## 6. Run With PM2

```bash
pm2 start npm --name hammer-production-tracker -- start
pm2 save
pm2 startup
```

Add a production start script if needed:

```json
"start": "next start --hostname 127.0.0.1 --port 3000"
```

## 7. Nginx Reverse Proxy

Example `/etc/nginx/sites-available/hammer-production-tracker`:

```nginx
server {
  listen 80;
  server_name YOUR_STATIC_IP_OR_DOMAIN;

  client_max_body_size 50M;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/hammer-production-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 8. HTTPS

Once a domain points at the VM:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 9. Current Backend Endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET /api/projects/:id/script-versions`
- `GET /api/projects/:id/approvals`
- `POST /api/projects/:id/approvals`
- `PATCH /api/approvals/:id`
- `POST /api/script-versions`

`POST /api/script-versions` accepts multipart form data:

- `projectId`
- `versionName`
- `uploadedBy`
- `file`

It stores the file under `UPLOAD_DIR` or GCS, parses the script, normalizes scenes/entities, stores raw JSON, and writes audit logs.

If an uploaded PDF has no selectable text, the app stores it as `ocr_required` so an OCR worker can process it later.

## 10. Bootstrap Admin

On first production login, use `ADMIN_EMAIL` and `ADMIN_PASSWORD`. If the matching user does not exist yet, the app creates an admin user with a hashed password.

After first login, rotate the bootstrap password and create named users/memberships through an admin workflow.

## 11. Next Backend Steps

- Move local UI state fully to database-backed queries.
- Add sequence/scene/shot CRUD APIs.
- Add the OCR worker for scanned PDFs.
- Add backups for MySQL and `UPLOAD_DIR`.
