# Spec-Driven Development: A Path Not Taken (Yet)

**Date:** January 25, 2026
**Context:** Reflection on GROOT's development approach

## Overview

This document explores how GROOT could be refactored to use **spec-driven development** (SDD), comparing it to our current **plan-driven iterative** approach.

---

## Current Approach: Plan-Driven Iterative

### How We've Been Working

1. **Phase Planning**: Detailed markdown plans with types, files, and functions
2. **Implementation**: Code written to match the plan
3. **Documentation**: Completion summaries after each phase
4. **Iteration**: Refine as we go, commit frequently

### Example: Phase 3 Plan

```markdown
## Implementation Steps

### Step 1: Add New Types
**File:** `src/types/index.ts`

New types for orchestration:
- `AgentHandoff` - Passes curriculum + feedback between agents
- `AgentFeedback` - Structured feedback from each agent
...
```

### Characteristics

- Human-readable plans (markdown)
- Flexible implementation
- Documentation as artifact, not driver
- Tests written after implementation (or not at all)

---

## Spec-Driven Development Alternative

### What It Would Look Like

Instead of markdown plans, we'd write **machine-readable specifications** that:
- Define contracts before implementation
- Generate code scaffolds, types, or tests
- Serve as living documentation
- Enable automated validation

---

## How GROOT Could Use Spec-Driven Development

### 1. JSON Schema for Data Structures

**Current:** Types defined in TypeScript manually

**Spec-Driven:** JSON Schema defines structures, TypeScript generated

```json
// schemas/curriculum.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Curriculum",
  "type": "object",
  "required": ["id", "title", "phases"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "title": { "type": "string", "minLength": 1 },
    "phases": {
      "type": "array",
      "items": { "$ref": "#/definitions/Phase" },
      "minItems": 1
    },
    "growthStage": {
      "type": "string",
      "enum": ["seed", "sprout", "sapling", "tree", "flowering", "seeding", "forest"]
    }
  }
}
```

**Tooling:**
- `json-schema-to-typescript` - Generate TypeScript interfaces
- `ajv` - Runtime validation against schema
- Schema becomes single source of truth

### 2. OpenAPI for Agent Communication

**Current:** Agent methods defined ad-hoc in classes

**Spec-Driven:** OpenAPI spec defines agent "APIs"

```yaml
# specs/orchestrator.openapi.yaml
openapi: 3.0.0
info:
  title: GROOT Orchestrator API
  version: 1.0.0

paths:
  /orchestrate/grow:
    post:
      summary: Run multi-agent curriculum generation
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [topic]
              properties:
                topic:
                  type: string
                fromFile:
                  type: boolean
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrchestrationResult'

components:
  schemas:
    AgentFeedback:
      type: object
      required: [agentName, feedbackType, message, severity]
      properties:
        agentName:
          type: string
          enum: [seedling, bark, canopy]
        feedbackType:
          type: string
          enum: [approval, concern, suggestion, blocker]
        # ...
```

**Tooling:**
- `openapi-typescript` - Generate types from spec
- `openapi-generator` - Generate client/server stubs
- Swagger UI - Interactive documentation

### 3. Gherkin for Behavior Specs (BDD)

**Current:** Manual testing, no formal behavior specs

**Spec-Driven:** Gherkin scenarios define expected behavior

```gherkin
# features/grow.feature
Feature: Multi-Agent Curriculum Generation
  As a learner
  I want to generate a reviewed curriculum
  So that I get high-quality learning materials

  Scenario: Generate curriculum for a new topic
    Given I have a valid API key configured
    When I run "groot grow 'Introduction to TypeScript'"
    Then Seedling should generate a curriculum
    And Canopy should review technical feasibility
    And Bark should review pedagogical soundness
    And a curriculum file should be created

  Scenario: Review existing curriculum
    Given I have an existing curriculum file "curriculum.json"
    When I run "groot grow --file curriculum.json"
    Then the existing curriculum should be loaded
    And Canopy should review technical feasibility
    And Bark should review pedagogical soundness

  Scenario: Debug mode shows agent interactions
    When I run "groot grow 'Python basics' --debug"
    Then I should see "[SEEDLING] PROMPT"
    And I should see "[CANOPY] HANDOFF"
    And I should see "[BARK] HANDOFF"
```

**Tooling:**
- `cucumber-js` - Run Gherkin specs as tests
- Specs become executable documentation
- Non-technical stakeholders can read/write specs

### 4. Contract Testing for Agents

**Current:** Agents loosely coupled, no formal contracts

**Spec-Driven:** Pact contracts define agent interactions

```javascript
// contracts/seedling-orchestrator.pact.js
const { Pact } = require('@pact-foundation/pact');

describe('Seedling-Orchestrator Contract', () => {
  it('Seedling returns curriculum when given topic', async () => {
    await provider.addInteraction({
      state: 'Seedling is ready',
      uponReceiving: 'a request to generate curriculum',
      withRequest: {
        method: 'generateCurriculum',
        body: { topic: 'TypeScript' }
      },
      willRespondWith: {
        status: 200,
        body: {
          curriculum: Matchers.like({
            id: Matchers.uuid(),
            title: Matchers.string(),
            phases: Matchers.eachLike({ number: 1 })
          })
        }
      }
    });
  });
});
```

---

## Project Structure: Spec-Driven GROOT

```
groot/
├── specs/                      # Specifications (source of truth)
│   ├── schemas/
│   │   ├── curriculum.schema.json
│   │   ├── feedback.schema.json
│   │   └── journal.schema.json
│   ├── openapi/
│   │   └── orchestrator.openapi.yaml
│   └── features/
│       ├── grow.feature
│       ├── remember.feature
│       └── ask.feature
├── src/
│   ├── generated/              # Auto-generated from specs
│   │   └── types.ts            # From JSON Schema
│   ├── agents/
│   ├── core/
│   └── cli/
├── contracts/                  # Pact contracts
└── tools/
    └── generate.ts             # Script to regenerate from specs
```

---

## Comparison: Pros and Cons

### Plan-Driven (Current Approach)

| Pros | Cons |
|------|------|
| Fast to start | Specs drift from implementation |
| Flexible, easy to change | No automated validation |
| Low tooling overhead | Documentation can become stale |
| Natural for solo/small teams | Types defined twice (plan + code) |
| Human-readable plans | No generated tests |

### Spec-Driven Development

| Pros | Cons |
|------|------|
| Single source of truth | Higher initial setup cost |
| Auto-generated types/tests | More tooling to maintain |
| Living documentation | Learning curve for spec formats |
| Contract validation | Can feel over-engineered for small projects |
| Better for team scaling | Specs can become bureaucratic |
| Catches breaking changes | Less flexibility for rapid prototyping |

---

## When to Use Each Approach

### Use Plan-Driven When:
- Solo developer or small team
- Rapid prototyping phase
- Requirements are fuzzy/evolving quickly
- Project is small to medium scope
- Speed of iteration matters most

### Use Spec-Driven When:
- Multiple developers/teams need coordination
- APIs consumed by external parties
- Long-term maintainability is critical
- Compliance/documentation requirements exist
- Project has stabilized past initial prototyping

---

## Hybrid Approach (Recommended for GROOT)

A pragmatic middle ground:

1. **Keep plan-driven for phases** - Markdown plans work well for iteration
2. **Add JSON Schema for core types** - Curriculum, Phase, Feedback
3. **Add Gherkin for CLI commands** - Executable acceptance tests
4. **Skip OpenAPI** - Internal agents don't need it yet
5. **Skip Pact contracts** - Overkill until agents are separate services

### Implementation Steps (If We Wanted To)

```bash
# 1. Install tooling
npm install --save-dev json-schema-to-typescript ajv cucumber

# 2. Create schemas for core types
mkdir -p specs/schemas
# Write curriculum.schema.json, etc.

# 3. Add generation script
# tools/generate-types.ts

# 4. Write Gherkin features for CLI
mkdir -p specs/features
# Write grow.feature, remember.feature

# 5. Update build process
# "prebuild": "npm run generate-types"
```

---

## Conclusion

GROOT's current plan-driven approach is appropriate for its stage:
- Solo development
- Rapid iteration through phases
- Learning/exploration focus

Spec-driven development would add value when:
- The project stabilizes
- Multiple contributors join
- External consumers need APIs
- Test coverage becomes critical

This document serves as a roadmap for that transition if/when it makes sense.

---

*"A spec is a promise. Make sure you can keep it."*
