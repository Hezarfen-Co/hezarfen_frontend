---
name: check-api-contract
description: "Check Hezarfen's live Swagger/OpenAPI contract against the frontend when Burak says 'API'ler güncellendi', 'yeni API geldi', 'Swagger'a bakalım', asks what changed in the backend API, or asks to check API drift. Use for inspection and compatibility checks; do not implement frontend changes unless requested."
---

# Check the live API contract

Treat the deployed OpenAPI document as the primary contract:

- Swagger UI: `https://hezarfen.dizey.sh/swagger/`
- OpenAPI JSON: `https://hezarfen.dizey.sh/api-docs/openapi.json`

Fetch the machine-readable document directly with `curl -fsSL` and use `jq`
to keep output focused. Do not clone or inspect the private backend repository
while the live OpenAPI document is reachable, unless Burak explicitly asks for
source-level investigation.

## Workflow

1. Confirm the health endpoint and OpenAPI JSON are reachable. Report HTTP or
   access failures plainly; never infer a contract from an unavailable service.
2. Narrow the inspection to the domain or endpoint Burak named. If none was
   named, compare the live path/method set and relevant request/response schemas
   with `src/api/`, its domain exports, and `src/api/__tests__/`.
3. Check more than route existence: compare HTTP method, path/query parameters,
   request bodies, response status codes, response unions, and referenced
   schemas. Pay special attention to authentication/session flow changes.
4. Lead with concrete compatibility findings and link the affected frontend
   files. Separate confirmed mismatches from items that still need runtime
   verification.
5. Do not edit code when the request is only to inspect, compare, or report.
   When Burak asks to implement the update, load `.claude/skills/api-layer/SKILL.md`
   before changing endpoint files and follow its required test workflow. Also
   load `solidjs-pitfalls` before changing SolidJS components.

Use the shared `web-research` skill only if the documented Swagger/OpenAPI URL
moves or public discovery is otherwise needed. Never send credentials, cookies,
private URLs, or tokenized URLs to a hosted scraper.
