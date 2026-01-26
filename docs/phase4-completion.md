# Phase 4 Completion: Session Management & Progress Tracking

## Overview

Phase 4 introduces **session management** to GROOT, enabling learners to start sessions (`wake`), track progress, and end sessions (`rest`) with handoff summaries for continuity.

## Key Architecture Decision: `.groot/` Directory

All GROOT data is stored in a `.groot/` folder within the project directory:

```
my-project/
├── .groot/                    # All GROOT data (removable)
│   ├── curriculum.json        # The active curriculum
│   ├── sessions/              # Learning session records
│   │   └── YYYY-MM-DD-phase-N.json
│   └── journal/               # Learning journal entries
│       └── YYYY-MM-DD-slug.md
├── src/                       # Your code (yours!)
├── package.json               # Your config (yours!)
└── README.md                  # Your docs (yours!)
```

**Benefits:**
- **Clean removal**: `rm -rf .groot/` removes all GROOT data
- **Project portability**: Share your project without GROOT metadata
- **Git-friendly**: Add `.groot/` to `.gitignore` if desired
- **Single curriculum per project**: Simpler mental model

## Implemented Features

### 1. Path Management (`src/core/paths.ts`)
Centralized path configuration:
- `getGrootDir()` - Get `.groot/` directory path
- `getCurriculumPath()` - Get curriculum.json path
- `getSessionsDir()` - Get sessions directory path
- `getJournalDir()` - Get journal directory path
- `isGrootInitialized()` - Check if `.groot/` exists
- `hasCurriculum()` - Check if curriculum.json exists
- `initGrootDir()` - Create `.groot/` structure
- `ensureGrootDir()` - Ensure `.groot/` exists

### 2. Session Types Extended (`src/types/index.ts`)
- Added `SessionStatus` type: `'active' | 'completed' | 'abandoned'`
- Extended `Session` interface with:
  - `curriculumPath`: Path to curriculum file
  - `curriculumTitle`: For display purposes
  - `phaseNumber`: Current phase number
  - `phaseTitle`: Current phase title
  - `status`: Session status
  - `handoff`: Optional handoff summary (populated on rest)

### 3. Session Manager (`src/core/session.ts`)
Core session management functions:
- `startSession(curriculum, phaseNumber)` - Create new session
- `startSessionFromPath(path, curriculum, phase)` - Create session with path
- `getCurrentSession()` / `setCurrentSession()` - Memory-based active session
- `saveSession(session)` - Persist to JSON file
- `loadSession(path)` - Load from file
- `listSessions(curriculumId?)` - List all or filtered sessions
- `findActiveSession()` - Find most recent active session
- `endSession(session, handoff)` - Complete session with handoff
- `markObjectiveComplete()` / `markDeliverableComplete()` - Track progress
- `addSessionNote()` / `addQuestionAsked()` - Session annotations
- `generateHandoff(session, phase)` - Create handoff summary
- `formatDuration()` / `getSessionSummary()` - Display helpers

### 4. Curriculum Functions (`src/core/curriculum-output.ts`)
Updated functions:
- `loadCurriculumJSON(filePath)` - Load curriculum from JSON
- `getCurrentCurriculum()` - Get curriculum from `.groot/curriculum.json`
- `saveCurriculum(curriculum)` - Save to `.groot/curriculum.json`
- `getCurriculumSummary()` - Get summary for display
- `updatePhaseStatus(path, phase, status)` - Update phase status
- `updateCurriculumProgress(path, phase, objectives, deliverables)` - Track completion

### 5. CLI Commands

#### `groot init`
Initialize GROOT in the current directory:
```bash
groot init
```

#### `groot plant <topic>`
Generate a curriculum (now saves to `.groot/curriculum.json`):
```bash
groot plant "TypeScript fundamentals"
groot plant "REST API design" --markdown ./README-curriculum.md
groot plant "React patterns" --beads
```

#### `groot wake`
Start a learning session:
```bash
groot wake              # Interactive phase selection
groot wake --phase 2    # Start specific phase
```

#### `groot rest`
End a learning session:
```bash
groot rest              # Interactive completion marking
groot rest --notes "Struggled with generics"
groot rest -q           # Quick rest (skip prompts)
```

#### `groot status`
Show current progress:
```bash
groot status
```

### 6. BEADS Integration (`src/core/beads.ts`)
- `addIssueComment(id, comment)` - Add comment to issue
- `updateBeadsSessionProgress(deliverables, epicId, handoff)` - Sync progress

## Session File Format

Sessions are stored in `.groot/sessions/YYYY-MM-DD-curriculum-slug-phase-N.json`:

```json
{
  "id": "uuid",
  "curriculumId": "curriculum-uuid",
  "curriculumPath": ".groot/curriculum.json",
  "curriculumTitle": "TypeScript Mastery",
  "phaseNumber": 1,
  "phaseTitle": "Environment Setup",
  "startedAt": "2026-01-25T09:00:00Z",
  "endedAt": "2026-01-25T11:30:00Z",
  "status": "completed",
  "notes": ["Struggled with tsconfig options"],
  "questionsAsked": [],
  "progress": {
    "objectivesCompleted": ["obj-1", "obj-2"],
    "deliverablesCompleted": ["del-1"],
    "timeSpentMinutes": 150
  },
  "handoff": {
    "summary": "Session on Phase 1...",
    "completedWork": [...],
    "remainingWork": [...],
    "nextSteps": [...],
    "promptForNextSession": "Resume Phase 1..."
  }
}
```

## Files Modified/Created

| File | Status | Description |
|------|--------|-------------|
| `src/core/paths.ts` | New | Centralized path configuration |
| `src/types/index.ts` | Modified | Extended Session interface |
| `src/core/session.ts` | New | Session management logic |
| `src/core/curriculum-output.ts` | Modified | Added curriculum loading functions |
| `src/core/journal.ts` | Modified | Updated to use `.groot/journal/` |
| `src/core/beads.ts` | Modified | Added session progress integration |
| `src/core/index.ts` | Modified | Export paths and session modules |
| `src/index.ts` | Modified | Export all new functions |
| `src/cli/index.ts` | Modified | Implemented all commands |

## Verification

All verification steps pass:
```bash
npm run build     # Compiles without errors
npm run lint      # No lint errors
groot init        # Creates .groot/ structure
groot status      # Shows curriculum and session info
groot wake        # Starts learning session
groot rest        # Ends session with handoff
```

## Usage Example

```bash
# Initialize a new project
mkdir my-learning-project
cd my-learning-project
groot init

# Generate a curriculum
groot plant "Building REST APIs with Node.js"

# Start learning
groot wake
# Select Phase 1

# During learning, ask questions
groot ask "What is middleware?"

# Take notes
groot remember "Middleware explained"

# End session
groot rest
# Mark completed objectives/deliverables

# Check progress
groot status

# Later, remove GROOT and ship your project
rm -rf .groot/
```

## Dependencies Added
- `inquirer@^12.6.0` - Interactive prompts
- `@types/inquirer@^9.0.7` - TypeScript types

## Next Steps (Phase 5+)

- Session analytics (time per phase, difficulty ratings)
- Session search/filter
- Export session history
- Project scaffolding with `groot seed`
