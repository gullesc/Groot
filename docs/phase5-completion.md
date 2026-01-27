# Phase 5 Completion: Project Scaffolding

## Overview

Phase 5 introduces **project scaffolding** to GROOT via the `groot seed` command. Learners can now generate project starter files based on their curriculum's phase deliverables, jumpstarting their implementation with properly structured code stubs.

## Implemented Features

### 1. `groot seed` Command

Generate project structure from curriculum deliverables:

```bash
groot seed [options]
  -p, --phase <N>      Phase number to scaffold (or interactive selection)
  -d, --dry-run        Preview files without creating them
  -f, --force          Overwrite existing files
  -t, --template <type>  Project template (typescript, javascript, python, minimal)
  -o, --output <dir>   Output directory (default: ./)
  -v, --verbose        Show detailed output
```

### 2. Template System

Four templates available:

| Template | Files Generated | Use Case |
|----------|----------------|----------|
| **TypeScript** | tsconfig.json, package.json, src/*.ts | Node.js with TypeScript |
| **JavaScript** | jsconfig.json, package.json, src/*.js | Node.js with plain JS |
| **Python** | requirements.txt, main.py, src/*.py | Python projects |
| **Minimal** | README.md, OBJECTIVES.md, folders | Non-code curricula |

### 3. Deliverable-to-Code Mapping

The scaffolder transforms curriculum metadata into code:

| Curriculum Data | Generated Output |
|----------------|------------------|
| Deliverable title | File name (kebab-case for TS/JS, snake_case for Python) |
| Deliverable description | File header/docstring |
| Acceptance criteria | TODO comments in code |
| Phase objectives | README learning objectives section |
| Key concepts | README concepts section |

### 4. Common Files

All templates generate these shared files:
- **README.md** - Phase overview with objectives, deliverables, and key concepts
- **OBJECTIVES.md** - Checklist for tracking progress

## Usage Examples

```bash
# Interactive mode - select phase and template
groot seed

# Scaffold specific phase with TypeScript
groot seed --phase 1 --template typescript

# Preview what would be created
groot seed --phase 2 --dry-run

# Python project for phase 3
groot seed --phase 3 --template python

# Overwrite existing files
groot seed --phase 1 --force
```

## Generated Output Examples

### TypeScript Template

```
project/
├── tsconfig.json
├── package.json
├── src/
│   ├── index.ts
│   ├── hello-world-app.ts    # From deliverable "Hello World App"
│   └── user-auth.ts          # From deliverable "User Auth"
├── README.md
└── OBJECTIVES.md
```

### Python Template

```
project/
├── requirements.txt
├── main.py
├── src/
│   ├── __init__.py
│   ├── hello_world_app.py    # snake_case naming
│   └── user_auth.py
├── README.md
└── OBJECTIVES.md
```

## Files Created/Modified

| File | Status | Description |
|------|--------|-------------|
| `src/types/index.ts` | Modified | Added scaffolding types |
| `src/core/scaffold.ts` | New | Core scaffolding logic |
| `src/templates/index.ts` | New | Template registry |
| `src/templates/typescript.ts` | New | TypeScript template |
| `src/templates/javascript.ts` | New | JavaScript template |
| `src/templates/python.ts` | New | Python template |
| `src/templates/minimal.ts` | New | Minimal template |
| `src/cli/index.ts` | Modified | Implemented seed command |
| `src/core/index.ts` | Modified | Export scaffold module |
| `src/index.ts` | Modified | Export scaffold and template functions |

## New Types

```typescript
type TemplateType = 'typescript' | 'javascript' | 'python' | 'minimal';

interface ScaffoldOptions {
  phaseNumber: number;
  templateType: TemplateType;
  outputDir: string;
  dryRun: boolean;
  force: boolean;
  verbose: boolean;
}

interface ScaffoldFile {
  path: string;
  content: string;
  type: 'file' | 'directory';
}

interface ScaffoldResult {
  success: boolean;
  filesCreated: string[];
  filesSkipped: string[];
  errors: string[];
}

interface TemplateDefinition {
  name: TemplateType;
  displayName: string;
  description: string;
  fileExtension: string;
  generateFiles: (context: ScaffoldContext) => ScaffoldFile[];
}
```

## Verification

All verification steps pass:

```bash
npm run build     # Compiles without errors
npm run lint      # No lint errors
groot seed --help # Shows all options
groot seed --dry-run --phase 1 --template typescript  # Preview works
groot seed --phase 1 --template python   # Creates Python files
```

## Integration with Existing Systems

- **Path System**: Uses `isGrootInitialized()` and `hasCurriculum()` for validation
- **Curriculum Loading**: Uses `getCurrentCurriculum()` to load curriculum data
- **Session System**: Suggests `groot wake --phase N` after scaffolding

## Next Steps (Phase 6+)

- Add more templates (Go, Rust, React, etc.)
- Template customization via `.grootrc` config
- Post-scaffold hooks (npm install, git init, etc.)
- Template inheritance for framework-specific variations
