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
# Install dependencies
npm install

# Build the project
npm run build

# Plant a new curriculum
groot plant "Building RAG Applications"

# Ask the tutor a question
groot ask "What is retrieval augmented generation?"

# Check your progress
groot status

# Start a learning session
groot wake

# End a session (saves state)
groot rest
```

## 📋 CLI Commands

| Command | Description |
|---------|-------------|
| `groot plant <topic>` | Generate a new curriculum for a topic |
| `groot ask <question>` | Ask the Tutor agent a question |
| `groot grow` | Trigger multi-agent curriculum review |
| `groot seed` | Scaffold project files for current phase |
| `groot status` | Show progress dashboard and growth stage |
| `groot wake` | Start a session, load context from BEADS |
| `groot rest` | End a session, save state, generate handoff |

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
