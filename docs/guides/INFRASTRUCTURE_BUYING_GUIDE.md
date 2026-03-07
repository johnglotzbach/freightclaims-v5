# FreightClaims v5 — Infrastructure Buying Guide

> **Audience:** Non-technical (CEO / Operations)
> **Goal:** Go from zero to a fully running FreightClaims v5 in production
> **Total monthly cost:** ~$33–48/month (down from ~$3,200/month on the old stack)

---

## Table of Contents

1. [Render (Hosting + Database + Cache)](#1-render-hosting--database--cache--28month) — ~$28/month
2. [Google Gemini API (AI)](#2-google-gemini-api--510month) — ~$5–10/month
3. [Domain & DNS](#3-domain--dns)
4. [Optional: AWS S3 (File Storage)](#4-optional-aws-s3-file-storage--15month)
5. [Optional: Email Provider (SMTP)](#5-optional-email-provider-smtp--05month)
6. [Complete Environment Variables](#6-complete-environment-variables)
7. [Cost Summary](#7-cost-summary)

---

## 1. Render (Hosting + Database + Cache) — ~$28/month

Render runs everything: the website, the backend API, the AI agent, the database, and the cache. One platform, one bill, one dashboard.

### 1.1 Create a Render Account

1. Open your browser and go to **https://render.com**
2. Click **Get Started for Free** (top-right)
3. Sign up with **GitHub** — this is the easiest option because Render needs access to your code
4. Authorize Render to access the `freightclaims-v5` repository when prompted
5. Confirm your email address

### 1.2 Create the Database — Render PostgreSQL

This is where all your data lives — claims, customers, users, documents metadata, everything.

1. From the Render Dashboard, click the **New +** button (top-right)
2. Select **PostgreSQL**
3. Fill in the settings:

| Setting | What to enter |
|---------|--------------|
| **Name** | `freightclaims-db` |
| **Database** | `freightclaims` |
| **User** | `fc_admin` |
| **Region** | `Ohio (US East)` — same region as your services |
| **PostgreSQL Version** | `16` |
| **Plan** | **Starter** — $7/month (1 GB RAM, 1 GB storage to start) |

4. Click **Create Database**
5. Wait 1–2 minutes for it to provision

**After creation:**
1. Click on the database name in the dashboard
2. Under **Connections**, find the **Internal Database URL** and **External Database URL**
3. Copy the **Internal Database URL** — it looks like: `postgres://fc_admin:PASSWORD@dpg-abc123:5432/freightclaims`
4. This is your `DATABASE_URL` — you'll paste it into the API service's environment variables

> **Tip:** Use the Internal URL when your API is also on Render (faster, no data transfer fees). Use the External URL when connecting from your local machine or a tool like Prisma Studio.

### 1.3 Create Service #1 — FreightClaims Web (the website visitors see)

This is the Next.js frontend — the part users interact with in their browser.

1. Click **New +** → **Web Service**
2. Choose **Build and deploy from a Git repository**, then click **Next**
3. Find and select the **freightclaims** repository → click **Connect**
4. Fill in the settings:

| Setting | What to enter |
|---------|--------------|
| **Name** | `freightclaims-web` |
| **Region** | Same region as your database |
| **Branch** | `main` |
| **Root Directory** | Leave blank |
| **Runtime** | `Node` |
| **Build Command** | `pnpm install --frozen-lockfile && pnpm --filter web build` |
| **Start Command** | `pnpm --filter web start` |
| **Instance Type** | **Starter** — $7/month |

5. Click **Create Web Service**

### 1.4 Create Service #2 — FreightClaims API (the backend brain)

1. Click **New +** → **Web Service** again
2. Connect the same repository
3. Fill in:

| Setting | What to enter |
|---------|--------------|
| **Name** | `freightclaims-api` |
| **Region** | Same region as your database |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `pnpm install --frozen-lockfile && pnpm --filter database generate && pnpm --filter api build` |
| **Start Command** | `pnpm --filter api start` |
| **Instance Type** | **Starter** — $7/month |

4. Click **Create Web Service**

### 1.5 Create Service #3 — FreightClaims AI Agent (the smart assistant)

1. Click **New +** → **Web Service** again
2. Connect the same repository
3. Fill in:

| Setting | What to enter |
|---------|--------------|
| **Name** | `freightclaims-ai` |
| **Region** | Same region as your database |
| **Branch** | `main` |
| **Runtime** | `Python 3` |
| **Build Command** | `cd apps/ai-agent && pip install -r requirements.txt && playwright install chromium` |
| **Start Command** | `cd apps/ai-agent && uvicorn app:app --host 0.0.0.0 --port 8000` |
| **Instance Type** | **Starter** — $7/month |

4. Click **Create Web Service**

### 1.6 Create Redis Cache (Free)

1. Click **New +** → **Redis**
2. Fill in:

| Setting | What to enter |
|---------|--------------|
| **Name** | `freightclaims-cache` |
| **Region** | Same region as everything else |
| **Plan** | **Free** — 25 MB (more than enough to start) |

3. Click **Create Redis**

### 1.7 Setting Environment Variables on Each Service

Each service needs secret values (database password, API keys, etc.) stored securely.

1. Go to your Render Dashboard
2. Click on a service (e.g., `freightclaims-api`)
3. In the left sidebar, click **Environment**
4. Click **Add Environment Variable**
5. Type the **Key** (e.g., `DATABASE_URL`) and the **Value** (the connection string from 1.2)
6. Repeat for every variable that service needs (full list in [Section 6](#6-complete-environment-variables))
7. Click **Save Changes**
8. The service will automatically redeploy with the new variables

### 1.8 Custom Domains

Once the services are running, point your real domain names to them:

**For the website (`app.freightclaims.com`):**
1. Click on `freightclaims-web` → **Settings** → scroll to **Custom Domains**
2. Click **Add Custom Domain**
3. Type `app.freightclaims.com` and click **Save**
4. Render will show you a CNAME record to add at your DNS provider

**For the API (`api.freightclaims.com`):**
1. Click on `freightclaims-api` → **Settings** → **Custom Domains**
2. Add `api.freightclaims.com`
3. Add the CNAME record Render shows you

**SSL (the padlock icon in the browser):** Render automatically creates and renews SSL certificates for all custom domains. No action needed.

### 1.9 Run Initial Database Setup

After the API deploys on Render with the `DATABASE_URL` set:

1. Go to Render → `freightclaims-api` → click the **Shell** tab
2. Run these two commands:
   ```
   npx prisma db push
   npx prisma db seed
   ```
   The first creates all the database tables. The second loads initial data (permissions, default roles, etc.).

---

## 2. Google Gemini API — ~$5–10/month

Gemini is the AI engine that powers our AI agents — it reads documents, classifies claims, drafts communications, and more.

### 2.1 Create a Google AI Project

1. Go to **https://aistudio.google.com**
2. Sign in with a Google account (your company Google Workspace account works)
3. Click **Get API key** in the top menu
4. Click **Create API key**
5. Select **Create API key in new project** (or use an existing Google Cloud project)
6. Google will generate an API key — it looks like: `AIzaSyB...long-string...XYZ`
7. **COPY AND SAVE THIS KEY** — this is your `GEMINI_API_KEY`

### 2.2 Configuration Details

| Setting | Value |
|---------|-------|
| Environment variable | `GEMINI_API_KEY` |
| Default model | `gemini-2.0-flash` |
| Set `AI_MODEL` env var to | `gemini-2.0-flash` |

### 2.3 Pricing

Gemini 2.0 Flash is extremely affordable:

| Metric | Cost |
|--------|------|
| Input tokens (reading documents) | ~$0.10 per 1 million tokens |
| Output tokens (generating text) | ~$0.40 per 1 million tokens |

For context: processing 100 freight claims per day (reading documents, classifying, drafting letters) would use roughly 2–5 million tokens/month, costing **$5–10/month**.

---

## 3. Domain & DNS

Point your domain names to the Render services. Do this at whatever company manages your domain (Cloudflare, GoDaddy, Namecheap, etc.).

### 3.1 Records to Add

| Type | Name | Value | Notes |
|------|------|-------|-------|
| CNAME | `app` | `freightclaims-web.onrender.com` | Your website |
| CNAME | `api` | `freightclaims-api.onrender.com` | Your backend API |

> For the root domain (`freightclaims.com` without any prefix), use CNAME flattening (Cloudflare does this automatically) or an A record pointing to Render's IP.

### 3.2 If Using Cloudflare (Recommended — Free)

1. Go to **https://dash.cloudflare.com**
2. Add your site → select the **Free** plan
3. Update your domain's nameservers to the ones Cloudflare gives you
4. Add the DNS records above
5. For the Render CNAME records, set proxy status to **DNS only** (grey cloud)

---

## 4. Optional: AWS S3 (File Storage) — ~$1–5/month

> **Note:** The app works without S3 using local disk storage on Render. Add S3 when you need persistent, scalable file storage for production claim documents.

If you want to use S3:

1. Create an AWS account at **https://aws.amazon.com**
2. Go to S3 → **Create bucket** → name it `freightclaims-documents` → keep defaults
3. Create an IAM user with S3 access:
   - Go to IAM → Users → Create user → `freightclaims-s3-user`
   - Attach the `AmazonS3FullAccess` policy (or create a custom policy for just your bucket)
   - Create an access key and save both the **Access Key ID** and **Secret Access Key**
4. On the Render API service, set these environment variables:
   - `STORAGE_MODE` = `s3`
   - `AWS_REGION` = your bucket region (e.g., `us-east-2`)
   - `AWS_ACCESS_KEY_ID` = your key
   - `AWS_SECRET_ACCESS_KEY` = your secret
   - `S3_DOCUMENTS_BUCKET` = `freightclaims-documents`

---

## 5. Optional: Email Provider (SMTP) — ~$0–5/month

The app sends email via SMTP. Use any provider:

| Provider | Free Tier | Setup |
|----------|-----------|-------|
| **SendGrid** | 100 emails/day | Sign up → create API key → use as SMTP credentials |
| **Mailgun** | 100 emails/day (sandbox) | Sign up → verify domain → get SMTP credentials |
| **AWS SES** | 62,000/month (if on AWS) | Verify domain → create SMTP credentials |
| **Resend** | 100 emails/day | Sign up → get API key |

Set these on the Render API service:

| Variable | Value |
|----------|-------|
| `SMTP_HOST` | Your provider's SMTP host (e.g., `smtp.sendgrid.net`) |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Provider username (e.g., `apikey` for SendGrid) |
| `SMTP_PASSWORD` | Provider password or API key |
| `EMAIL_FROM` | `claims@freightclaims.com` |

---

## 6. Complete Environment Variables

### FreightClaims API (`freightclaims-api`)

| Variable | Value / How to get it | Required? |
|----------|----------------------|-----------|
| `NODE_ENV` | `production` | Yes |
| `PORT` | `4000` | Yes |
| `DATABASE_URL` | Internal connection string from Render PostgreSQL (Section 1.2) | Yes |
| `JWT_SECRET` | Run `openssl rand -hex 32` to generate | Yes |
| `ENCRYPTION_KEY` | Run `openssl rand -hex 16` to generate | Yes |
| `STORAGE_MODE` | `local` (or `s3` if using AWS S3) | Yes |
| `LOCAL_UPLOAD_DIR` | `/opt/render/project/uploads` | Only if STORAGE_MODE=local |
| `GEMINI_API_KEY` | From Section 2.1 | Yes (for AI) |
| `AI_MODEL` | `gemini-2.0-flash` | Yes |
| `REDIS_URL` | Internal connection string from Render Redis (Section 1.6) | Optional |
| `NEXT_PUBLIC_APP_URL` | `https://app.freightclaims.com` | Yes |
| `LOG_FORMAT` | `json` | Yes |
| `LOG_LEVEL` | `info` | Yes |
| `SMTP_HOST` | Your SMTP provider host | Optional |
| `SMTP_PORT` | `587` | Optional |
| `SMTP_USER` | Your SMTP username | Optional |
| `SMTP_PASSWORD` | Your SMTP password | Optional |
| `EMAIL_FROM` | `claims@freightclaims.com` | Optional |
| `AWS_REGION` | `us-east-2` | Only if STORAGE_MODE=s3 |
| `AWS_ACCESS_KEY_ID` | From IAM user | Only if STORAGE_MODE=s3 |
| `AWS_SECRET_ACCESS_KEY` | From IAM user | Only if STORAGE_MODE=s3 |
| `S3_DOCUMENTS_BUCKET` | `freightclaims-documents` | Only if STORAGE_MODE=s3 |

### FreightClaims Web (`freightclaims-web`)

| Variable | Value | Required? |
|----------|-------|-----------|
| `NODE_ENV` | `production` | Yes |
| `NEXT_PUBLIC_API_URL` | `https://api.freightclaims.com/api/v1` (or Render internal URL) | Yes |
| `NEXT_PUBLIC_AI_URL` | `https://freightclaims-ai.onrender.com/api/v1` | Yes |
| `NEXT_PUBLIC_APP_URL` | `https://app.freightclaims.com` | Yes |

### FreightClaims AI Agent (`freightclaims-ai`)

| Variable | Value | Required? |
|----------|-------|-----------|
| `GEMINI_API_KEY` | From Section 2.1 | Yes |
| `AI_MODEL` | `gemini-2.0-flash` | Yes |
| `API_BASE_URL` | `https://api.freightclaims.com/api/v1` (or Render internal URL) | Yes |

---

## 7. Cost Summary

### Monthly Breakdown (Core — No AWS)

| Service | What it does | Plan | Monthly Cost |
|---------|-------------|------|-------------|
| Render — Web | Hosts the website | Starter | $7 |
| Render — API | Hosts the backend | Starter | $7 |
| Render — AI Agent | Hosts the AI service | Starter | $7 |
| Render — PostgreSQL | Stores all data | Starter | $7 |
| Render — Redis | Caching | Free | $0 |
| Google Gemini API | AI processing | Pay-per-use | ~$5–10 |
| Cloudflare DNS | Domain management | Free | $0 |
| **Total** | | | **~$33–38/month** |

### Optional Add-ons

| Service | When | Monthly Cost |
|---------|------|-------------|
| AWS S3 (file storage) | Heavy document uploads | ~$2–5 |
| SMTP provider | Transactional email | ~$0–5 |
| ConvertAPI | PDF processing | Free tier |
| Background Worker | Heavy AI batch processing | $25 (Render Standard) |

### Compared to Old Infrastructure

| | Old Stack | FreightClaims v5 |
|---|-----------|------------------|
| Monthly cost | ~$3,200/month | ~$33–38/month |
| Annual cost | ~$38,400/year | ~$396–456/year |
| **Annual savings** | — | **~$37,000+** |

---

## Quick-Reference Checklist

- [ ] **Render account** created and GitHub connected
- [ ] **Render PostgreSQL** created (Starter $7/mo)
- [ ] **Render Redis** created (Free)
- [ ] **Render Web Service** created (Starter $7/mo)
- [ ] **Render API Service** created (Starter $7/mo)
- [ ] **Render AI Service** created (Starter $7/mo)
- [ ] **DATABASE_URL** copied from Render PostgreSQL to API service env vars
- [ ] **REDIS_URL** copied from Render Redis to API service env vars
- [ ] **Google Gemini API key** created and saved
- [ ] **Environment variables** set on all three Render services
- [ ] **Database initialized** (`prisma db push` and `prisma db seed` via Render Shell)
- [ ] **DNS CNAME records** pointing to Render services
- [ ] **Test the site** — visit your Render URL and log in
- [ ] *(Optional)* AWS S3 bucket created and configured
- [ ] *(Optional)* SMTP provider configured

---

*Last updated: February 2026*
