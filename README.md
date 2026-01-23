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
| 🪵 **Bark** | The Tutor — Answers questions, provides feedback, catches misconceptions |
| 🌲 **Canopy** | The AI Architect — Advises on technical implementation, reviews designs |

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

# 5. Try asking the tutor a question
npm run start -- ask "What is TypeScript?"

# 6. Generate a curriculum for a topic (Phase 2 ✅)
npm run start -- plant "Building REST APIs" -o ./my-curriculum.md

# Check your progress
npm run start -- status
```

## 🌱 Current Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Single agent architecture with Bark (Tutor) agent |
| Phase 2 | ✅ Complete | Curriculum generation with Seedling agent |
| Phase 3 | 🚧 Planned | Multi-agent orchestration with Canopy agent |
| Phase 4 | 🚧 Planned | Progress tracking and adaptation |
| Phase 5 | 🚧 Planned | Project scaffolding |
| Phase 6 | 🚧 Planned | Extensibility and distribution |

## 📋 CLI Commands

| Command | Status | Description |
|---------|--------|-------------|
| `groot ask <question>` | ✅ Working | Ask the Bark (Tutor) agent a question |
| `groot status` | ✅ Working | Show progress dashboard and BEADS status |
| `groot plant <topic>` | ✅ Working | Generate a new curriculum for a topic |
| `groot grow` | 🚧 Phase 3 | Trigger multi-agent curriculum review |
| `groot wake` | 🚧 Phase 4 | Start a session, load context from BEADS |
| `groot rest` | 🚧 Phase 4 | End a session, save state, generate handoff |
| `groot seed` | 🚧 Phase 5 | Scaffold project files for current phase |

## 🛠️ Tech Stack

- **Language**: TypeScript
- **AI**: Claude API (Anthropic)
- **State Management**: [BEADS](https://github.com/steveyegge/beads) - Git-backed issue tracker as agent memory
- **CLI Framework**: Commander.js

## 📁 Project Structure

```
groot/
├── src/
│   ├── agents/          # Agent implementations
│   │   ├── base.ts      # Base agent class
│   │   ├── seedling.ts  # Curriculum Architect
│   │   ├── bark.ts      # Tutor
│   │   └── canopy.ts    # AI Architect
│   ├── core/            # Core functionality
│   │   ├── orchestrator.ts
│   │   ├── beads.ts     # BEADS integration
│   │   └── config.ts
│   ├── cli/             # CLI commands
│   │   └── index.ts
│   └── types/           # TypeScript types
│       └── index.ts
├── docs/                # Documentation
├── templates/           # Curriculum templates
├── scaffolds/           # Project scaffolds
└── .beads/              # BEADS state directory
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
