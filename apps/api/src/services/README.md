# Services

Business logic layer. Services contain the domain rules, workflows, and data transformation
logic that controllers call. Services call repositories for database access and never touch
Express request/response objects directly.

- `claims.service.ts` - Claim lifecycle, status transitions, party/product management
- `users.service.ts` - Auth flows (login, register, JWT), user management, roles
- `customers.service.ts` - Customer CRUD, contacts, addresses
- `shipments.service.ts` - Shipment CRUD, carrier management, insurance
- `documents.service.ts` - S3 upload/download, document metadata, categories
- `email.service.ts` - Email dispatch, notification management
- `search.service.ts` - Cross-entity search queries
- `reports.service.ts` - Analytics aggregations, report generation
- `automation.service.ts` - Rule engine, template execution
- `ai.service.ts` - AI agent orchestration, copilot conversations

## Convention

- One service per domain
- Services are exported as singleton objects
- All methods are async and return typed data (never Response objects)
- Business validation happens here (not in controllers or repositories)
