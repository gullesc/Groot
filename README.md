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
# 1. Install dependencies
npm install

# 2. Install BEADS (if not already installed)
curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash
# Add BEADS to your PATH
export PATH="$PATH:$HOME/.local/bin"

# 3. Set up your environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 4. Build the project
npm run build

# 5. Generate a curriculum with multi-agent review (Phase 3 ✅)
npm run start -- grow "Building REST APIs"

# 6. Ask the tutor a question
npm run start -- ask "What is TypeScript?"

# 7. Capture a learning insight
npm run start -- remember "Key insight about REST" -c "REST uses HTTP methods..."

# Check your progress
npm run start -- status
```

## 🌱 Current Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Single agent architecture with Bark (Tutor) agent |
| Phase 2 | ✅ Complete | Curriculum generation with Seedling agent |
| Phase 3 | ✅ Complete | Multi-agent orchestration with Canopy agent |
| Phase 4 | 🚧 Planned | Progress tracking and adaptation |
| Phase 5 | 🚧 Planned | Project scaffolding |
| Phase 6 | 🚧 Planned | Extensibility and distribution |

## 📋 CLI Commands

| Command | Status | Description |
|---------|--------|-------------|
| `groot ask <question>` | ✅ Working | Ask the Bark (Tutor) agent a question |
| `groot status` | ✅ Working | Show progress dashboard and BEADS status |
| `groot plant <topic>` | ✅ Working | Generate a new curriculum (single agent) |
| `groot grow <topic>` | ✅ Working | Generate + multi-agent review curriculum |
| `groot remember <title>` | ✅ Working | Capture learning insights as journal entries |
| `groot wake` | 🚧 Phase 4 | Start a session, load context from BEADS |
| `groot rest` | 🚧 Phase 4 | End a session, save state, generate handoff |
| `groot seed` | 🚧 Phase 5 | Scaffold project files for current phase |

### `groot grow` Options

```bash
groot grow "topic"              # Generate and review curriculum
groot grow --file curriculum.json  # Review existing curriculum
groot grow "topic" --beads      # Also create BEADS issues
groot grow "topic" -v           # Verbose output
groot grow "topic" --debug      # Show full agent interactions
```

### `groot remember` Options

```bash
groot remember "Title"                    # Interactive content input
groot remember "Title" -c "content"       # Inline content
groot remember --list                     # List all entries
groot remember --view <slug>              # View specific entry
groot remember "Title" --phase "Phase 1"  # Add context
```

## 🛠️ Tech Stack

- **Language**: TypeScript
- **AI**: Claude API (Anthropic)
- **State Management**: [BEADS](https://github.com/steveyegge/beads) - Git-backed issue tracker as agent memory
- **CLI Framework**: Commander.js

## 📁 Project Structure

```
groot/
├── src/
│   ├── agents/              # Agent implementations
│   │   ├── base.ts          # Base agent class
│   │   ├── seedling.ts      # Curriculum Architect
│   │   ├── bark.ts          # Tutor (+ review_pedagogy)
│   │   └── canopy.ts        # AI Architect (technical review)
│   ├── core/                # Core functionality
│   │   ├── orchestrator.ts  # Multi-agent coordination
│   │   ├── journal.ts       # Learning journal
│   │   ├── beads.ts         # BEADS integration
│   │   ├── curriculum-output.ts
│   │   ├── curriculum-beads.ts
│   │   └── config.ts
│   ├── cli/                 # CLI commands
│   │   └── index.ts
│   └── types/               # TypeScript types
│       └── index.ts
├── docs/                    # Documentation
│   └── journal/             # Learning journal entries
├── templates/               # Curriculum templates
├── scaffolds/               # Project scaffolds
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

## 🔧 Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## 📚 Prerequisites

- Node.js 18+
- [BEADS](https://github.com/steveyegge/beads) installed (`bd` command available)
- Anthropic API key (set as `ANTHROPIC_API_KEY` environment variable)

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## 📄 License

MIT

---

*"I am Groot."* — Translation: "Let's grow together."
