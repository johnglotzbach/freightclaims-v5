# Shared Package

Types, constants, and utility functions shared across all apps in the monorepo.

## Usage

```typescript
import { Claim, ClaimStatus, CLAIM_TYPES, formatCurrency } from 'shared';
```

## Contents

- `src/types/` - TypeScript interfaces for all domain entities
- `src/constants/` - Business rules, enums, Carmack timelines, status colors
- `src/utils/` - Formatting helpers, date math, claim number generation
