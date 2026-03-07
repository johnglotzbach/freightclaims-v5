# Controllers

Request/response handling layer. Controllers are thin -- they parse the request,
call the appropriate service method, and format the response. No business logic here.

Each controller exports a singleton object with methods matching the route handlers.

## Convention

- File naming: `{domain}.controller.ts`
- Export a const object: `export const {domain}Controller = { ... }`
- Methods take `(req, res, next)` and call `next(error)` on failure
- Use `asyncHandler` wrapper to avoid try/catch boilerplate
