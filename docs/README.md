# FreightClaims v5.0 Documentation

All documentation for the FreightClaims platform, organized by purpose.

---

## Quick Start

| I want to...                        | Read this                                                                 |
|--------------------------------------|---------------------------------------------------------------------------|
| Set up my local dev environment      | [Developer Setup](./guides/DEVELOPER_SETUP.md)                           |
| Understand the system architecture   | [Architecture Overview](./architecture/ARCHITECTURE.md)                   |
| See all API endpoints                | [API Reference](./reference/API_REFERENCE.md)                            |
| Learn how the AI agents work         | [AI Agents Guide](./architecture/AI_AGENTS_GUIDE.md)                     |
| Explore the database schema          | [Database Schema](./architecture/DATABASE_SCHEMA.md)                     |
| Deploy to production                 | [Deployment Guide](./guides/DEPLOYMENT_GUIDE.md)                         |
| Set up Render + services from scratch| [Infrastructure Buying Guide](./guides/INFRASTRUCTURE_BUYING_GUIDE.md)   |
| Contribute code                      | [Contributing](./guides/CONTRIBUTING.md)                                  |

---

## Folder Structure

```
docs/
  README.md                       <-- You are here
  CHANGELOG.md                    <-- Release history

  guides/                         <-- How-to guides
    DEVELOPER_SETUP.md            <-- Local dev setup (prereqs, Docker, env vars, running services)
    DEPLOYMENT_GUIDE.md           <-- Production deployment on Render
    INFRASTRUCTURE_BUYING_GUIDE.md <-- What to buy, what plans, step-by-step for non-devs
    CONTRIBUTING.md               <-- Branch naming, commit style, PR process, code standards

  architecture/                   <-- System design docs
    ARCHITECTURE.md               <-- Monorepo structure, data flow, middleware, caching, auth
    DATABASE_SCHEMA.md            <-- All 60+ Prisma models, relationships, multi-tenancy
    AI_AGENTS_GUIDE.md            <-- All 13 agents, supervisor, tools, Gemini client, adding new agents

  reference/                      <-- Technical reference
    API_REFERENCE.md              <-- All 15 route modules, every endpoint, request/response formats
```

---

## Platform Overview

**FreightClaims v5** is a monorepo built with:

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Zustand, TanStack Query
- **Backend**: Express + TypeScript, Prisma ORM, JWT auth, Zod validation
- **AI**: 13 specialized agents powered by Google Gemini API + Python browser automation
- **Database**: PostgreSQL 16 (Render Managed)
- **Storage**: Local disk (default) or AWS S3 (optional, for production file storage)
- **Cache**: Redis (Render Managed)
- **Email**: Any SMTP provider (SendGrid, Mailgun, SES, etc.)
- **Hosting**: Render (3 services: Web, API, AI Agent + managed Postgres + managed Redis)

### Key Features

- AI-powered claim intake with OCR, email parsing, and document classification
- 13 AI agents: Intake, Documents, Compliance, Negotiation, Valuation, Follow-Up, Copilot, Predictor, Risk Scoring, Fraud Detection, Denial Response, Communication, Root Cause Analysis
- Carmack Amendment deadline monitoring and automated follow-ups
- Carrier risk scoring and fraud detection
- News/newsletter system (replaces blog)
- Interactive onboarding with guided tours
- AI chatbot for public and authenticated users
- Contracts, insurance certificates, and carrier tariffs management
- Multi-tenant architecture with granular RBAC
- 60+ database models across 15 API route modules
- 59 frontend pages with responsive dark-mode UI

---

## Monthly Cost (All on Render)

| Service                | Plan              | Cost/month |
|-----------------------|-------------------|------------|
| Render Web (frontend) | Starter           | $7         |
| Render API (backend)  | Starter           | $7         |
| Render AI Agent       | Starter           | $7         |
| Render PostgreSQL     | Starter           | $7         |
| Render Redis          | Starter           | $0 (free)  |
| Google Gemini API     | Pay-as-you-go     | ~$5-10     |
| **Total**             |                   | **~$33-38** |

Optional add-ons:

| Service              | When needed            | Cost/month |
|---------------------|------------------------|------------|
| AWS S3              | Production file storage | ~$2-5     |
| SMTP Provider       | Transactional email     | ~$0-5     |
| ConvertAPI          | PDF conversion          | Free      |

vs. old infrastructure: **$3,200/month** (saving ~$37,000+/year)
