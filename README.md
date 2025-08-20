# Paradigm Backend (CLEAN)

## What’s included
- Next.js App Router (API only)
- MongoDB models + indexes (no seed users)
- Redis locks (chat typing + KB upload)
- MinIO (S3) presigned uploads
- RBAC guards, audit logs, rate limiting
- n8n webhook: `POST /api/integrations/n8n/chat-response`

## Run
```bash
docker compose up -d
cp .env.local.example .env.local
npm i
npm run init:storage
npm run init:indexes
npm run dev
# -> http://localhost:3000/api/health
```


## Seed data
```bash
npm run seed
# Admin:    amit.admin@example.com / Admin@123
# Super:    mikael.super@example.com / Super@123
# Team:     amir.team@example.com / Team@123
```
