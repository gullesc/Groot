# AGENTS.md - GROOT Project Conventions

## Project Overview

GROOT (Guided Resource for Organized Objective Training) is a multi-agent AI system for generating personalized learning curricula. This document defines conventions for AI agents working on this codebase.

**Current Status:** Phase 1 (First Sprout) is complete! The Bark (Tutor) agent is fully functional with BEADS integration.

## BEADS Integration

**CRITICAL**: This project uses BEADS for task tracking and agent memory.

Before starting any work:
```bash
bd onboard    # First time setup
bd ready      # See available tasks
bd wake       # Load session context (when implemented)
```

After completing work:
```bash
bd update <id> --status closed
bd rest       # Save session state (when implemented)
```

### Filing Issues

- File issues for any discovered work: `bd create "Description" -t task -p <priority>`
- Use `--type epic` for multi-phase work
- Link related issues: `bd dep add <child> <parent> --type discovered-from`

### Priorities

- P0: Critical/blocking issues
- P1: High priority, needed for current phase
- P2: Normal priority (default)
- P3: Nice to have
- P4: Backlog/future consideration

## Code Conventions

### TypeScript

- Use strict TypeScript (`strict: true` in tsconfig)
- Prefer `interface` over `type` for object shapes
- Use Zod for runtime validation of external data
- Async/await over raw promises
- Explicit return types on exported functions

### File Organization

```
src/
├── agents/       # One file per agent
├── core/         # Shared infrastructure
├── cli/          # CLI command handlers
├── types/        # Type definitions (index.ts exports all)
└── utils/        # Helper functions
```

### Naming Conventions

- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

### Agent Development

Each agent should:
1. Extend the `BaseAgent` class
2. Define a clear system prompt
3. Declare available tools
4. Integrate with BEADS for memory

```typescript
export class MyAgent extends BaseAgent {
  readonly name = 'my-agent';
  readonly systemPrompt = `...`;
  readonly tools = [...];
}
```

## Commit Conventions

Format: `<type>(<scope>): <description>`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

Examples:
```
feat(agents): implement Bark tutor agent
fix(cli): handle missing ANTHROPIC_API_KEY
docs(readme): add installation instructions
```

## Testing

- Unit tests alongside source files: `foo.ts` → `foo.test.ts`
- Integration tests in `tests/` directory
- Run tests before committing: `npm test`

## Environment Variables

Required:
- `ANTHROPIC_API_KEY`: Your Anthropic API key

Optional:
- `GROOT_DEBUG`: Enable debug logging
- `GROOT_CONFIG_PATH`: Custom config file path

## Session Management

When ending a coding session ("landing the plane"):

1. Ensure all tests pass
2. Update BEADS with completed/remaining work
3. Commit changes with descriptive message
4. Run `bd sync` to push BEADS state
5. Leave a summary comment for the next session

## The GROOT Agents

| Agent | File | Purpose |
|-------|------|---------|
| 🌿 Seedling | `seedling.ts` | Curriculum generation |
| 🪵 Bark | `bark.ts` | Tutoring and Q&A |
| 🌲 Canopy | `canopy.ts` | Technical architecture |

## Growth Philosophy

Remember: GROOT is about **growing** learners through hands-on experience. Every feature should support:

- 🌱 **Progressive complexity** - Start simple, add depth
- 🔄 **Iteration** - Allow revisiting and refining
- 📊 **Trackable progress** - Visible growth stages
- 🤝 **Agent collaboration** - "We are Groot"

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
