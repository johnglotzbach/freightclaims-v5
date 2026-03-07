# Utils

Shared utility functions used across the API. These are stateless helpers -- no business logic belongs here.

- `logger.ts` - Pino logger singleton (JSON in prod, pretty in dev)
- `errors.ts` - Custom error classes with HTTP status codes
- `encryption.ts` - AES encryption/decryption helpers
- `dates.ts` - Date formatting and timezone conversion
- `pagination.ts` - Pagination parameter parsing and response formatting
