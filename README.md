# 🌳 G.R.O.O.T.

**Guided Resource for Organized Objective Training**

> "We are Groot." — We grow together.

GROOT is a multi-agent AI system that generates personalized, project-based learning curricula for technical professionals. Like its namesake, GROOT helps you **grow** — planting seeds of knowledge, nurturing your understanding through hands-on projects, and watching you flourish into mastery.

## 🌱 Philosophy

- **Plant**: Start with a seed — a topic you want to learn
- **Grow**: Build progressively through hands-on phases
- **Branch**: Explore related concepts as your understanding expands
- **Root**: Solidify knowledge through deliverables you can demonstrate
- **Flourish**: Emerge with deep, practical understanding

## 🤖 The GROOT Agents

GROOT consists of three specialized AI agents that collaborate to create and deliver your learning experience:

| Agent | Role |
|-------|------|
| 🌿 **Seedling** | The Curriculum Architect — Designs learning paths, phases, objectives, and sequencing |
| 🪵 **Bark** | The Tutor — Answers questions, provides feedback, reviews pedagogical soundness |
| 🌲 **Canopy** | The AI Architect — Reviews technical feasibility, suggests patterns, evaluates architecture |

### Hub-and-Spoke Orchestration

```
           Orchestrator
          /     |     \
     Seedling  Bark  Canopy
```

Agents communicate through a central Orchestrator (not directly with each other). When you run `groot grow`:

1. **Seedling** generates the curriculum structure
2. **Canopy** reviews for technical feasibility
3. **Bark** reviews for pedagogical soundness
4. **Orchestrator** merges feedback and produces the final curriculum

## 🚀 Quick Start

```bash
# 1. Install GROOT globally (or use npx)
npm install -g groot

# 2. Create your learning project
mkdir my-project
cd my-project

# 3. Initialize GROOT
groot init

# 4. Generate a curriculum
groot plant "Building REST APIs with Node.js"

# 5. Start a learning session
groot wake

# 6. Work on your project, ask questions
groot ask "What is middleware?"

# 7. End your session
groot rest

# 8. When done learning, ship your project!
rm -rf .groot/   # Remove GROOT, keep your code
```

## 📁 The `.groot/` Directory

All GROOT data lives in a `.groot/` folder in your project — completely separate from your code:

```
my-project/
├── .groot/                    # GROOT data (removable)
│   ├── curriculum.json        # Your learning plan
│   ├── constitution.md        # Project coding standards
│   ├── sessions/              # Session history
│   └── journal/               # Learning notes
├── specs/                     # SDD artifacts (per phase)
│   └── phase-1/
│       └── deliverable-name/
│           ├── spec.md        # Feature specification
│           ├── plan.md        # Implementation plan
│           └── tasks.md       # Task checklist
├── src/                       # YOUR code
├── tests/                     # Test files
├── package.json               # YOUR config
└── README.md                  # YOUR docs
```

**To remove GROOT from any project:** `rm -rf .groot/`

Your code is always 100% yours. GROOT is just a companion for learning.

## 🌱 Current Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Single agent architecture with Bark (Tutor) agent |
| Phase 2 | ✅ Complete | Curriculum generation with Seedling agent |
| Phase 3 | ✅ Complete | Multi-agent orchestration with Canopy agent |
| Phase 4 | ✅ Complete | Session management and progress tracking |
| Phase 5 | ✅ Complete | Project scaffolding with templates |
| Phase 6 | ✅ Complete | Extensibility & Configuration |
| Phase 7 | ✅ Complete | Interactive Curriculum Generation |
| Phase 8 | ✅ Complete | Test Generation & UX Improvements |
| Phase 9 | ✅ Complete | Automated Phase Verification |
| Phase 10 | ✅ Complete | Solution Generator (Answer Key) |
| Phase 11 | ✅ Complete | True TDD Workflow |
| Phase 12 | ✅ Complete | Spec-Driven Development (SDD) |

## 📋 CLI Commands

| Command | Description |
|---------|-------------|
| `groot init` | Initialize GROOT in current directory |
| `groot plant <topic>` | Generate a curriculum |
| `groot grow <topic>` | Generate + multi-agent review curriculum |
| `groot wake` | Start a learning session |
| `groot rest` | End session with handoff summary |
| `groot status` | Show curriculum and session progress |
| `groot ask <question>` | Ask the tutor a question |
| `groot remember <title>` | Capture learning notes |
| `groot seed` | Scaffold project files for a phase |
| `groot config` | Manage configuration settings |
| `groot check` | Verify phase completion via tests |
| `groot solve` | Generate solution implementations |

### Command Examples

```bash
# Initialize and create curriculum
groot init
groot plant "TypeScript fundamentals"
groot plant "React patterns" --beads     # Also create BEADS tasks

# Multi-agent curriculum generation
groot grow "Building REST APIs"
groot grow "topic" --debug               # Show agent interactions

# Session management
groot wake                               # Start session
groot wake --phase 2                     # Start specific phase
groot rest                               # End with handoff
groot rest -q                            # Quick end (skip prompts)
groot status                             # Check progress

# Learning
groot ask "What is dependency injection?"
groot remember "Key insight" -c "content"
groot remember --list                    # List journal entries

# Scaffolding
groot seed                               # Interactive template/phase selection
groot seed --phase 1 --template typescript  # TypeScript project
groot seed --phase 2 --template python   # Python project
groot seed --dry-run                     # Preview without creating files

# Interactive curriculum generation
groot plant "Machine Learning" --interactive   # Personalized curriculum

# Configuration
groot config --list                            # Show all settings
groot config --init                            # Create .grootrc

# Test verification
groot check                                    # Check specs + run tests
groot check --phase 1 --update                 # Mark passing deliverables
groot check --specs-only                       # Only validate spec artifacts

# Spec-Driven Development (SDD)
groot solve --phase 1                          # Generate SDD spec artifacts
groot solve --phase 1 --prompt                 # Get Claude Code prompt
groot solve -d "Deliverable" --prompt          # Prompt for specific deliverable

# TDD + SDD workflow
groot seed --phase 1 --template python --tdd   # Generate tests + specs
groot seed --phase 1 --skip-specs              # Skip spec generation
```

### Available Templates

| Template | Description |
|----------|-------------|
| `typescript` | Node.js + TypeScript with Jest |
| `javascript` | Node.js + JavaScript |
| `python` | Python with pytest |
| `react` | React + Vite + TypeScript |
| `vue` | Vue 3 + Vite + TypeScript |
| `minimal` | Basic structure only |

## 🛠️ Tech Stack

- **Language**: TypeScript
- **AI**: Claude API (Anthropic)
- **State Management**: [BEADS](https://github.com/steveyegge/beads) - Git-backed issue tracker as agent memory
- **CLI Framework**: Commander.js
- **Interactive Prompts**: Inquirer.js

## 📁 Project Structure

```
groot/
├── src/
│   ├── agents/              # Agent implementations
│   │   ├── base.ts          # Base agent class
│   │   ├── seedling.ts      # Curriculum Architect
│   │   ├── bark.ts          # Tutor
│   │   └── canopy.ts        # AI Architect
│   ├── core/                # Core functionality
│   │   ├── paths.ts         # .groot/ and specs/ path management
│   │   ├── session.ts       # Session lifecycle
│   │   ├── orchestrator.ts  # Multi-agent coordination
│   │   ├── journal.ts       # Learning journal
│   │   ├── beads.ts         # BEADS integration
│   │   ├── scaffold.ts      # Project scaffolding
│   │   ├── hooks.ts         # Post-scaffold hooks
│   │   ├── test-runner.ts   # Jest/pytest test runner
│   │   ├── test-generator.ts # Claude-based TDD tests
│   │   ├── solver.ts        # SDD workflow coordinator
│   │   ├── spec-generator.ts # SDD artifact generation
│   │   ├── spec-validator.ts # Spec validation for groot check
│   │   ├── prompt-generator.ts # Claude Code prompt generation
│   │   ├── constitution-generator.ts # Project constitution
│   │   └── config.ts
│   ├── templates/           # Project templates
│   │   ├── typescript.ts    # TypeScript + Jest
│   │   ├── python.ts        # Python + pytest
│   │   ├── react.ts         # React + Vite
│   │   └── vue.ts           # Vue 3 + Vite
│   ├── cli/                 # CLI commands
│   │   └── index.ts
│   └── types/               # TypeScript types
│       └── index.ts
├── docs/                    # Documentation
└── .beads/                  # BEADS state directory
```

## 🌲 Growth Stages

As you progress through a curriculum, you'll move through growth stages:

| Stage | Icon | Description |
|-------|------|-------------|
| Seed | 🌰 | Just starting, preparing environment |
| Sprout | 🌱 | First concepts taking root |
| Sapling | 🪴 | Building foundational skills |
| Tree | 🌳 | Core competency achieved |
| Flowering | 🌸 | Applying knowledge creatively |
| Seeding | 🌾 | Ready to teach others |
| Forest | 🌲🌳🌴 | Mastery achieved |

## 📋 Spec-Driven Development (SDD)

GROOT generates **spec-driven development artifacts** that work with Claude Code or GitHub Copilot:

- **spec.md**: Feature specification with requirements and acceptance criteria
- **plan.md**: Implementation approach and architecture decisions
- **tasks.md**: Step-by-step implementation checklist
- **constitution.md**: Project-wide coding standards and rules

```bash
# Scaffold project with specs
groot seed --phase 1 --template python       # Creates specs automatically

# Or generate specs separately
groot solve --phase 1                        # Generate spec artifacts

# Get a ready-to-paste prompt for Claude Code
groot solve --phase 1 --prompt

# Validate specs exist before running tests
groot check --specs-only
```

**Prerequisites**: Claude Code or GitHub Copilot is required for implementing from specs.

## 🧪 TDD + SDD Workflow

GROOT combines Test-Driven Development with Spec-Driven Development:

1. **SEED**: `groot seed --tdd` generates failing tests + spec artifacts
2. **READ**: Review `specs/phase-N/<deliverable>/spec.md` for requirements
3. **RED**: Run `groot check` - tests fail initially
4. **IMPLEMENT**: Use Claude Code/Copilot with the generated specs
5. **GREEN**: Run `groot check` - tests pass
6. **REFACTOR**: Clean up while keeping tests green

```bash
# Generate project with tests + specs
groot seed --phase 1 --template python --tdd

# Read the specs
cat specs/phase-1/*/spec.md

# Run tests (they will fail - RED)
groot check --phase 1

# Get a prompt for Claude Code if stuck
groot solve --phase 1 --prompt

# Implement your code using Claude Code or Copilot...

# Verify tests pass (GREEN)
groot check --phase 1
```

## ⚙️ Configuration

GROOT uses hierarchical configuration:

1. Default settings (built-in)
2. `~/.groot/config.yaml` (user-level)
3. `.grootrc` (project-level)
4. Environment variables (highest priority)

```bash
groot config --list        # View current config
groot config --init        # Create project config
groot config --init-user   # Create user config
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY

# Build
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## 📚 Prerequisites

- Node.js 18+
- Anthropic API key (set as `ANTHROPIC_API_KEY` environment variable)
- [BEADS](https://github.com/steveyegge/beads) (optional, for task tracking)

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## 📄 License

MIT

---

*"I am Groot."* — Translation: "Let's grow together."
