# Routes

Express route definitions, one file per domain. Each route file imports its controller
and wires up HTTP methods, middleware (auth, validation), and path parameters.

- `claims.routes.ts` - Claim CRUD, status, payments, parties, products, comments, tasks
- `users.routes.ts` - Auth (login/register), user management, roles, permissions
- `customers.routes.ts` - Customer orgs, contacts, addresses, notes
- `shipments.routes.ts` - Shipments, carriers, insurance, suppliers
- `documents.routes.ts` - Document upload/download, categories, OCR
- `email.routes.ts` - Email sending, templates, notification preferences
- `search.routes.ts` - Universal cross-entity search
- `reports.routes.ts` - Insights, analytics, report generation
- `automation.routes.ts` - Automation rules, templates, scheduled jobs
- `ai.routes.ts` - AI agent endpoints, conversations, copilot

## Convention

Each route file exports a single `Router` instance named `{domain}Router`.
All routes are mounted under `/api/v1/{domain}` in `server.ts`.
