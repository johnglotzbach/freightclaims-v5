# AI Agent Framework

Supervisor-orchestrated agent system for autonomous freight claim processing.
All agents use the Google Gemini API for language understanding and generation.

## Architecture

```
Request → Supervisor → [Route] → Specialized Agent → Result
                    → [Chain] → Next Agent → ...
                    → Aggregated Result
```

The **Supervisor** (`supervisor.ts`) receives every request and either:
- Routes to an explicitly-requested agent (e.g., `POST /agents/intake`)
- Uses Gemini to auto-route based on the request content

Agents can **chain** — if one agent returns `nextAgent`, the supervisor
hands off to that agent automatically (up to 5 steps).

## Agents

| Agent | File | Description |
|-------|------|-------------|
| Intake | `intake.agent.ts` | Extracts structured claim data from raw text, emails, documents |
| Documents | `documents.agent.ts` | Checks for missing required documents, drafts request emails |
| Compliance | `compliance.agent.ts` | Carmack Amendment timeline tracking and violation detection |
| Negotiation | `negotiation.agent.ts` | Analyzes carrier denials, generates legal rebuttals |
| Valuation | `valuation.agent.ts` | Predicts settlement ranges and recommends strategy |
| Follow-Up | `followup.agent.ts` | Monitors stale claims, escalates through follow-up chain |
| Copilot | `copilot.agent.ts` | Conversational AI for user questions about claims |

## Tools

Agents interact with the system through **tools** defined in `tools.ts`.
Each tool wraps a database operation and is available by name:

- `getClaim` — Full claim with relations
- `searchClaims` — Filter/search claims
- `getClaimDocuments` — List docs on a claim
- `checkMissingDocuments` — Compare uploaded vs required docs
- `getCarrier` — Carrier lookup by SCAC
- `addTimelineEntry` — Log status change
- `createTask` — Create a follow-up task
- `addComment` — Add internal note
- `updateClaimStatus` — Change claim status
- `getClaimHistory` — Historical settlement data

## Files

```
agents/
├── index.ts            # Public exports
├── types.ts            # TypeScript interfaces
├── gemini-client.ts    # Gemini API wrapper
├── supervisor.ts       # Orchestration and routing
├── registry.ts         # Agent registration
├── tools.ts            # Tool definitions
├── intake.agent.ts     # Claim intake agent
├── documents.agent.ts  # Missing documents agent
├── compliance.agent.ts # Legal compliance agent
├── negotiation.agent.ts# Carrier negotiation agent
├── valuation.agent.ts  # Claim valuation agent
├── followup.agent.ts   # Status follow-up agent
└── copilot.agent.ts    # Customer copilot agent
```
