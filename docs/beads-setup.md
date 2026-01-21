# GROOT - Initial BEADS Setup

This file contains the initial epics and tasks to import into BEADS.
Run these commands after `bd init` to set up your task tracking.

## Create Phase Epics

```bash
# Phase 0: Preparing the Soil
bd create "Phase 0: Preparing the Soil - Foundation Setup" -t epic -p 1 -d "Set up development environment, install BEADS, create project structure"

# Phase 1: First Sprout  
bd create "Phase 1: First Sprout - Single Agent Architecture" -t epic -p 2 -d "Build minimal agent framework, implement Bark (Tutor) agent, create CLI"
```

## Phase 0 Tasks (run after creating epics)

```bash
# Get the Phase 0 epic ID from the output above, then:
# Replace bd-XXXX with the actual epic ID

bd create "Set up Node.js project with TypeScript" -t task -p 1 -d "Initialize npm, configure tsconfig, set up linting"
bd create "Install and configure BEADS" -t task -p 1 -d "Run bd init, verify bd commands work"  
bd create "Create AGENTS.md with project conventions" -t task -p 1 -d "Document coding standards and BEADS workflow"
bd create "Set up project directory structure" -t task -p 1 -d "Create src/, docs/, templates/, scaffolds/ directories"
bd create "Create base TypeScript types" -t task -p 2 -d "Define core interfaces for Curriculum, Phase, Agent, etc."
bd create "Verify development environment" -t task -p 2 -d "Ensure npm run build works, test basic CLI"
```

## Phase 1 Tasks

```bash
bd create "Implement BaseAgent class" -t task -p 1 -d "Create abstract base class with chat(), setContext(), tools support"
bd create "Implement Bark (Tutor) agent" -t task -p 1 -d "Create tutor agent with system prompt and basic tools"
bd create "Create groot ask CLI command" -t task -p 1 -d "CLI command to chat with Bark agent"
bd create "Integrate BEADS into Bark agent" -t task -p 2 -d "Bark should log topics discussed to BEADS"
bd create "Add conversation history to agents" -t task -p 2 -d "Maintain chat history within a session"
bd create "Create groot status command" -t task -p 2 -d "Show BEADS status and ready work"
bd create "Write unit tests for BaseAgent" -t task -p 3 -d "Test agent initialization, context, chat flow"
```

## Quick Setup Script

Save this as `setup-beads.sh` and run it:

```bash
#!/bin/bash

echo "🌳 Setting up GROOT with BEADS..."

# Initialize BEADS
bd init --quiet

# Create Phase 0 Epic
echo "Creating Phase 0 epic..."
bd create "Phase 0: Preparing the Soil" -t epic -p 1

# Create Phase 1 Epic
echo "Creating Phase 1 epic..."
bd create "Phase 1: First Sprout" -t epic -p 2

echo ""
echo "✅ BEADS initialized! Run 'bd list' to see your epics."
echo "📋 Run 'bd ready' to see what's ready to work on."
echo ""
echo "Next: Create tasks for Phase 0 using the commands in docs/beads-setup.md"
```
