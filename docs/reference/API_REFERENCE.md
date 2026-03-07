# API Reference

> Complete REST API reference for FreightClaims v5.

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Health Checks](#health-checks)
- [Claims](#claims)
- [Users](#users)
- [Customers](#customers)
- [Shipments](#shipments)
- [Documents](#documents)
- [Email](#email)
- [Search](#search)
- [Reports](#reports)
- [Automation](#automation)
- [AI Agents](#ai-agents)
- [Email Submission](#email-submission)
- [Contracts](#contracts)
- [News](#news)
- [Onboarding](#onboarding)
- [Chatbot](#chatbot)

---

## Overview

**Base URL**: `http://localhost:4000/api/v1` (development) or `https://api.freightclaims.com/api/v1` (production)

All endpoints under `/api/v1` unless noted otherwise. Request and response bodies use JSON (`Content-Type: application/json`).

---

## Authentication

Most endpoints require a valid JWT access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Obtain tokens via the login endpoint. Access tokens expire in 15 minutes; use the refresh endpoint to obtain new ones.

### Public Endpoints (No Auth Required)

- `POST /users/login`
- `POST /users/register`
- `POST /users/refresh-token`
- `POST /users/forgot-password`
- `POST /users/reset-password`
- `GET /news` (public posts)
- `GET /news/categories`
- `GET /news/post/:slug`
- `POST /news/subscribe`
- `POST /news/unsubscribe`
- `POST /chatbot/message`
- `GET /chatbot/conversation/:sessionId`
- `POST /chatbot/conversation/:sessionId/resolve`
- `GET /health`
- `GET /ready`

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142
  }
}
```

---

## Error Handling

### Error Response

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request — validation failed |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — insufficient permissions |
| `404` | Not Found |
| `429` | Too Many Requests — rate limited |
| `500` | Internal Server Error |

---

## Health Checks

These are mounted at the root (not under `/api/v1`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Basic liveness check. Returns `{ status: "ok" }` |
| `GET` | `/ready` | Readiness check with database connectivity. Returns `{ status: "ready", database: "connected" }` |

---

## Claims

**Base**: `/api/v1/claims`

### Core CRUD

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Required | List claims with pagination and filtering |
| `GET` | `/:id` | Required | Get claim by ID with all relations |
| `POST` | `/` | Required | Create a new claim |
| `PUT` | `/:id` | Required | Update a claim |
| `DELETE` | `/:id` | Admin, Manager | Soft-delete a claim |

**Query Parameters** (GET `/`):

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `status` | string | Filter by status |
| `claimType` | string | Filter by claim type |
| `customerId` | string | Filter by customer |
| `search` | string | Search by claim number or PRO number |
| `sortBy` | string | Sort field |
| `sortOrder` | `asc` \| `desc` | Sort direction |

### Status

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PUT` | `/:id/status` | Required | Update claim status (creates timeline entry) |

### Parties

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/:id/parties` | Required | List parties for a claim |
| `POST` | `/:id/parties` | Required | Add a party (claimant, carrier, payee, shipper, consignee) |
| `PUT` | `/:id/parties/:partyId` | Required | Update a party |
| `DELETE` | `/:id/parties/:partyId` | Required | Remove a party |

### Products

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/:id/products` | Required | List products for a claim |
| `POST` | `/:id/products` | Required | Add a product |
| `PUT` | `/:id/products/:productId` | Required | Update a product |
| `DELETE` | `/:id/products/:productId` | Required | Remove a product |

### Comments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/:id/comments` | Required | List comments for a claim |
| `POST` | `/:id/comments` | Required | Add a comment (types: comment, note, system, email) |

### Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/:id/tasks` | Required | List tasks for a claim |
| `POST` | `/:id/tasks` | Required | Create a task |
| `PUT` | `/:id/tasks/:taskId` | Required | Update a task |
| `DELETE` | `/:id/tasks/:taskId` | Required | Delete a task |

### Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/:id/payments` | Required | List payments for a claim |
| `POST` | `/:id/payments` | Required | Record a payment (settlement, partial, insurance, salvage) |
| `PUT` | `/:id/payments/:paymentId` | Required | Update a payment |

### Identifiers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/:id/identifiers` | Required | List identifiers (BOL, PO, ref, tracking) |
| `POST` | `/:id/identifiers` | Required | Add an identifier |

### Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/dashboard/stats` | Required | Dashboard statistics (counts by status, amounts, trends) |

### Mass Upload

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/mass-upload` | Required | Bulk upload claims from file |
| `GET` | `/mass-upload/history` | Required | Mass upload job history |

### Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/settings/all` | Admin | Get all claim settings |
| `PUT` | `/settings` | Admin | Update claim settings |

### Acknowledgement

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/:id/acknowledgement` | Required | Get claim acknowledgement details |
| `POST` | `/:id/acknowledgement` | Required | Create/send acknowledgement |

---

## Users

**Base**: `/api/v1/users`

### Authentication (Public)

| Method | Path | Auth | Rate Limited | Description |
|--------|------|------|-------------|-------------|
| `POST` | `/login` | No | Yes | Login with email/password. Returns access + refresh tokens. |
| `POST` | `/register` | No | Yes | Register a new account |
| `POST` | `/refresh-token` | No | No | Exchange refresh token for new token pair |
| `POST` | `/forgot-password` | No | Yes | Send password reset email |
| `POST` | `/reset-password` | No | Yes | Reset password with token |

**Login Request**:

```json
{
  "email": "admin@freightclaims.com",
  "password": "admin123!"
}
```

**Login Response**:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "admin@freightclaims.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": { "id": "uuid", "name": "Super Admin" }
    }
  }
}
```

### Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/me` | Required | Get current user profile |
| `PUT` | `/me` | Required | Update current user profile |
| `PUT` | `/me/password` | Required | Change password |
| `GET` | `/me/preferences` | Required | Get user preferences (notifications, theme, timezone) |
| `PUT` | `/me/preferences` | Required | Update user preferences |

### User Management (Admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Admin | List all users |
| `GET` | `/:id` | Admin | Get user by ID |
| `POST` | `/` | Admin | Create a user |
| `PUT` | `/:id` | Admin | Update a user |
| `DELETE` | `/:id` | Admin | Deactivate a user |

### Roles (Admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/roles/all` | Admin | List all roles with permissions |
| `POST` | `/roles` | Admin | Create a role |
| `PUT` | `/roles/:id` | Admin | Update a role and its permissions |

### Permissions (Admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/permissions/all` | Admin | List all permissions |
| `PUT` | `/permissions/:id` | Admin | Update a permission |

### Templates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/templates/email` | Required | List email templates |
| `POST` | `/templates/email` | Admin | Create email template |
| `PUT` | `/templates/email/:id` | Admin | Update email template |
| `GET` | `/templates/letter` | Required | List letter templates |
| `POST` | `/templates/letter` | Admin | Create letter template |
| `PUT` | `/templates/letter/:id` | Admin | Update letter template |

---

## Customers

**Base**: `/api/v1/customers`

### Core CRUD

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Required | List customers (paginated, filterable) |
| `GET` | `/:id` | Required | Get customer by ID |
| `POST` | `/` | Admin | Create a customer |
| `PUT` | `/:id` | Admin, Manager | Update a customer |
| `DELETE` | `/:id` | Admin | Soft-delete a customer |

### Contacts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/:id/contacts` | Required | List contacts for a customer |
| `POST` | `/:id/contacts` | Required | Add a contact |
| `PUT` | `/:id/contacts/:contactId` | Required | Update a contact |
| `DELETE` | `/:id/contacts/:contactId` | Required | Remove a contact |

### Addresses

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/:id/addresses` | Required | List addresses (billing, shipping) |
| `POST` | `/:id/addresses` | Required | Add an address |
| `PUT` | `/:id/addresses/:addressId` | Required | Update an address |
| `DELETE` | `/:id/addresses/:addressId` | Required | Remove an address |

### Notes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/:id/notes` | Required | List customer notes |
| `POST` | `/:id/notes` | Required | Add a note |

### Reports & Lookup

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/:id/reports` | Required | Customer-specific claim reports |
| `GET` | `/lookup/countries` | Required | List available countries |
| `GET` | `/lookup/address-autocomplete` | Required | Address autocomplete |

---

## Shipments

**Base**: `/api/v1/shipments`

### Core CRUD

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Required | List shipments |
| `GET` | `/:id` | Required | Get shipment by ID |
| `POST` | `/` | Required | Create a shipment |
| `PUT` | `/:id` | Required | Update a shipment |
| `DELETE` | `/:id` | Required | Delete a shipment |

### Shipment Contacts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/:id/contacts` | Required | List contacts (shipper, consignee, notify) |
| `POST` | `/:id/contacts` | Required | Add a contact |

### Carriers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/carriers/all` | Required | List all carriers |
| `GET` | `/carriers/:id` | Required | Get carrier by ID |
| `POST` | `/carriers` | Admin | Create a carrier |
| `PUT` | `/carriers/:id` | Admin | Update a carrier |
| `GET` | `/carriers/:id/contacts` | Required | List carrier contacts |
| `POST` | `/carriers/:id/contacts` | Required | Add carrier contact |
| `GET` | `/carriers/data/scac` | Required | SCAC code lookup |
| `GET` | `/carriers/integrated/all` | Required | List carriers with integrations |
| `GET` | `/carriers/integrated/:id/keys` | Required | Get carrier integration credentials |
| `GET` | `/carriers/international/all` | Required | List international carriers |

### Insurance

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/insurance/all` | Required | List insurance providers |
| `GET` | `/insurance/:id` | Required | Get insurance provider |
| `POST` | `/insurance` | Required | Create insurance provider |
| `GET` | `/insurance/:id/contacts` | Required | List insurance contacts |

### Suppliers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/suppliers/all` | Required | List suppliers |
| `POST` | `/suppliers` | Required | Create a supplier |
| `GET` | `/suppliers/:id/addresses` | Required | List supplier addresses |
| `POST` | `/suppliers/:id/addresses` | Required | Add supplier address |

### Mass Upload

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/mass-upload` | Required | Bulk upload shipments |

---

## Documents

**Base**: `/api/v1/documents`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Required | List documents (filterable by claim, category) |
| `GET` | `/:id` | Required | Get document metadata |
| `POST` | `/upload` | Required | Upload a document (multipart/form-data) |
| `DELETE` | `/:id` | Required | Delete a document |
| `GET` | `/:id/download` | Required | Download document file |
| `GET` | `/:id/url` | Required | Get download URL (pre-signed S3 URL or local file URL) |

### Categories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/categories/all` | Required | List document categories |
| `POST` | `/categories` | Admin | Create a category |
| `PUT` | `/categories/:id` | Admin | Update a category |
| `DELETE` | `/categories/:id` | Admin | Delete a category |
| `GET` | `/categories/mapping` | Required | Get category-to-claim-type mappings (required docs) |
| `POST` | `/categories/mapping` | Admin | Create/update category mapping |

### AI Processing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/:id/process` | Required | Trigger AI processing on a document (OCR, extraction) |
| `GET` | `/:id/extracted-data` | Required | Get AI-extracted data for a document |

---

## Email

**Base**: `/api/v1/email`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/send` | Required | Send an email (via SMTP) |
| `GET` | `/claim/:claimId` | Required | Get email logs for a claim |

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/notifications` | Required | List all notifications for current user |
| `GET` | `/notifications/unread` | Required | Get unread notification count |
| `PUT` | `/notifications/:id/read` | Required | Mark a notification as read |
| `PUT` | `/notifications/read-all` | Required | Mark all notifications as read |

### Preferences

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/preferences` | Required | Get email preferences |
| `PUT` | `/preferences` | Required | Update email preferences |

### Queue

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/process-queue` | Required | Process the email send queue (SQS) |

---

## Search

**Base**: `/api/v1/search`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Required | Universal search across all entities |
| `GET` | `/claims` | Required | Search claims |
| `GET` | `/customers` | Required | Search customers |
| `GET` | `/carriers` | Required | Search carriers |
| `GET` | `/shipments` | Required | Search shipments |

**Query Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query |
| `page` | number | Page number |
| `limit` | number | Results per page |

All search results are scoped to the current tenant via `corporateId`.

---

## Reports

**Base**: `/api/v1/reports`

All report endpoints accept a date range and optional filters in the request body.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/insights` | Required | General claim insights (counts, amounts, statuses over time) |
| `POST` | `/insights/top-customers` | Required | Top customers by claim volume/amount |
| `POST` | `/insights/top-carriers` | Required | Top carriers by claim volume/amount |
| `POST` | `/insights/collection-percentage` | Required | Collection rate analysis |
| `POST` | `/insights/metrics-per-carrier` | Required | Detailed metrics broken down by carrier |
| `POST` | `/insights/metrics-per-destination` | Required | Metrics broken down by destination |
| `POST` | `/insights/write-off-amount` | Required | Write-off analysis |
| `GET` | `/export/:type` | Required | Export report as CSV/Excel (type: `claims`, `customers`, etc.) |

**Request Body Example**:

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "carrierId": "optional-uuid",
  "customerId": "optional-uuid",
  "claimType": "damage"
}
```

---

## Automation

**Base**: `/api/v1/automation`

### Rules

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/rules` | Required | List automation rules |
| `GET` | `/rules/:id` | Required | Get rule by ID |
| `POST` | `/rules` | Admin | Create a rule |
| `PUT` | `/rules/:id` | Admin | Update a rule |
| `DELETE` | `/rules/:id` | Admin | Delete a rule |

### Templates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/templates` | Required | List automation templates |
| `POST` | `/templates` | Admin | Create a template |
| `PUT` | `/templates/:id` | Admin | Update a template |
| `DELETE` | `/templates/:id` | Admin | Delete a template |

### Trigger

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/trigger/:ruleId` | Admin, Manager | Manually trigger an automation rule |

---

## AI Agents

**Base**: `/api/v1/ai`

### Agent Endpoints

Each agent endpoint accepts a claim context and returns agent-specific analysis.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/agents/intake` | Required | Run Claim Intake Agent — extract data from emails/docs, classify, detect duplicates |
| `POST` | `/agents/compliance` | Required | Run Legal Compliance Agent — Carmack timelines, deadline checks |
| `POST` | `/agents/negotiation` | Required | Run Negotiation Agent — denial rebuttals, settlement strategy |
| `POST` | `/agents/valuation` | Required | Run Valuation Agent — settlement prediction and strategy |
| `POST` | `/agents/documents` | Required | Run Missing Documents Agent — identify missing docs, draft follow-ups |
| `POST` | `/agents/followup` | Required | Run Follow-Up Agent — status follow-ups, escalation |
| `POST` | `/agents/predictor` | Required | Run Outcome Predictor — predict outcome, timeline, settlement amount |
| `POST` | `/agents/risk` | Required | Run Risk Scoring Agent — carrier risk and reliability analysis |
| `POST` | `/agents/fraud` | Required | Run Fraud Detection Agent — anomaly detection, duplicate flagging |
| `POST` | `/agents/denial` | Required | Run Denial Response Agent — analyze denials, draft appeals |
| `POST` | `/agents/communication` | Required | Run Communication Agent — draft carrier correspondence |
| `POST` | `/agents/rootcause` | Required | Run Root Cause Agent — predictive root cause analysis across claim clusters |

**Common Request Body**:

```json
{
  "claimId": "uuid",
  "agentType": "intake",
  "context": {
    "additionalInstructions": "Focus on missing documentation"
  }
}
```

### Copilot

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/copilot/chat` | Required | Send a message to the AI copilot |
| `GET` | `/copilot/conversations` | Required | List copilot conversations |
| `GET` | `/copilot/conversations/:id` | Required | Get conversation with messages |
| `DELETE` | `/copilot/conversations/:id` | Required | Delete a conversation |

**Copilot Chat Request**:

```json
{
  "message": "What documents are missing for claim CLM-2025-001?",
  "conversationId": "optional-uuid"
}
```

### Status & History

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/status` | Required | Get AI system status (agent availability) |
| `GET` | `/history` | Required | List recent AI agent runs |

---

## Email Submission

**Base**: `/api/v1/email-submission`

Configuration for email-based claim submission (claims created from incoming emails).

### Config

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/config` | Required | Get email submission configuration |
| `PUT` | `/config` | Admin | Update email submission configuration |

### Approved Domains

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/domains` | Admin | Add an approved email domain |
| `PUT` | `/domains/:id` | Admin | Update an approved domain |
| `DELETE` | `/domains/:id` | Admin | Remove an approved domain |

### Approved Senders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/senders` | Admin | Add an approved sender email |
| `PUT` | `/senders/:id` | Admin | Update an approved sender |
| `DELETE` | `/senders/:id` | Admin | Remove an approved sender |
| `POST` | `/validate-sender` | Required | Validate if a sender email is approved |

---

## Contracts

**Base**: `/api/v1/contracts`

### Contracts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Required | List contracts |
| `POST` | `/` | Required | Create a contract |
| `GET` | `/:id` | Required | Get contract by ID |
| `PUT` | `/:id` | Required | Update a contract |
| `DELETE` | `/:id` | Required | Delete a contract |

### Insurance Certificates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/insurance` | Required | List insurance certificates |
| `POST` | `/insurance` | Required | Create an insurance certificate |
| `GET` | `/insurance/:id` | Required | Get insurance certificate |
| `PUT` | `/insurance/:id` | Required | Update insurance certificate |

### Tariffs & Release Values

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/tariffs` | Required | List carrier tariffs |
| `POST` | `/tariffs` | Required | Create a tariff |
| `GET` | `/release-values` | Required | List release value tables |
| `POST` | `/release-values` | Required | Create a release value entry |

---

## News

**Base**: `/api/v1/news`

### Public Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | No | List published news posts |
| `GET` | `/categories` | No | List news categories |
| `GET` | `/post/:slug` | No | Get a news post by slug |
| `POST` | `/subscribe` | No | Subscribe to newsletter |
| `POST` | `/unsubscribe` | No | Unsubscribe from newsletter |

### Admin Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/posts` | Required | List all posts (including drafts) |
| `POST` | `/admin/posts` | Required | Create a news post |
| `PUT` | `/admin/posts/:id` | Required | Update a news post |
| `DELETE` | `/admin/posts/:id` | Required | Delete a news post |
| `POST` | `/admin/categories` | Required | Create a news category |
| `GET` | `/admin/subscribers` | Required | List newsletter subscribers |

---

## Onboarding

**Base**: `/api/v1/onboarding`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/me` | Required | Get current user's onboarding state |
| `PUT` | `/me` | Required | Update onboarding state |
| `POST` | `/me/complete-step` | Required | Mark an onboarding step as completed |
| `POST` | `/me/dismiss-tour` | Required | Dismiss a tour/walkthrough |
| `POST` | `/me/reset` | Required | Reset onboarding progress |

---

## Chatbot

**Base**: `/api/v1/chatbot`

Public-facing chatbot for website visitors (no authentication required).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/message` | No | Send a message and receive a response |
| `GET` | `/conversation/:sessionId` | No | Get conversation history by session ID |
| `POST` | `/conversation/:sessionId/resolve` | No | Mark a conversation as resolved |

**Message Request**:

```json
{
  "sessionId": "unique-session-id",
  "message": "How do I file a freight claim?",
  "visitorEmail": "optional@email.com"
}
```
