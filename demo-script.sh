#!/bin/bash
# =============================================================================
# GROOT Demo Script - Full Feature Walkthrough
# =============================================================================
# This script demonstrates all GROOT capabilities for creating personalized
# learning curricula with multi-agent AI assistance.
#
# Prerequisites:
#   - Node.js 18+
#   - ANTHROPIC_API_KEY environment variable set
#   - GROOT installed globally (npm install -g groot)
#
# Usage: Run commands interactively to demo, or source sections as needed
# =============================================================================

set -e  # Exit on error

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo_header() {
    echo -e "\n${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}\n"
}

echo_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

echo_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

pause() {
    echo -e "\n${GREEN}Press Enter to continue...${NC}"
    read
}

# =============================================================================
# PART 1: Setup & Initialization
# =============================================================================

echo_header "GROOT Demo - Guided Resource for Organized Objective Training"

echo_info "GROOT is a multi-agent AI system that generates personalized,"
echo_info "project-based learning curricula. Let's explore all its features!"
echo ""
echo_info "The three GROOT agents:"
echo "  - Seedling: The Curriculum Architect"
echo "  - Bark: The Tutor"
echo "  - Canopy: The AI Architect"

pause

# Create demo directory
echo_header "Part 1: Project Setup"

echo_step "Creating demo project directory..."
mkdir -p groot-demo && cd groot-demo
echo "Created: $(pwd)"

pause

# =============================================================================
# PART 2: Initialize GROOT
# =============================================================================

echo_header "Part 2: Initialize GROOT"

echo_step "groot init - Initialize GROOT in the current directory"
echo_info "This creates the .groot/ directory structure"
echo ""

# Run the init command
groot init

echo ""
echo_info "GROOT is now initialized! Check the .groot/ directory:"
ls -la .groot/ 2>/dev/null || echo "(directory created)"

pause

# =============================================================================
# PART 3: Configuration
# =============================================================================

echo_header "Part 3: Configuration Management"

echo_step "groot config --list - View all current settings"
groot config --list

pause

echo_step "groot config --init - Create project-level .grootrc file"
echo_info "Configuration hierarchy: defaults < ~/.groot/config.yaml < .grootrc < env vars"
groot config --init

pause

# =============================================================================
# PART 4: Curriculum Generation Options
# =============================================================================

echo_header "Part 4: Curriculum Generation (Multiple Methods)"

echo_info "GROOT offers several ways to generate curricula:"
echo "  1. groot plant <topic>          - Quick single-agent generation"
echo "  2. groot plant <topic> --beads  - With BEADS task tracking"
echo "  3. groot plant --interactive    - Personalized via questions"
echo "  4. groot grow <topic>           - Full multi-agent review"
echo "  5. groot grow <topic> --debug   - With agent interaction logs"
echo ""

pause

# Option A: Simple curriculum generation
echo_step "Option A: groot plant \"Building REST APIs with Node.js\""
echo_info "Quick curriculum generation with Seedling agent only"
echo ""

groot plant "Building REST APIs with Node.js"

pause

# Show generated curriculum
echo_step "Viewing the generated curriculum..."
cat .groot/curriculum.json | head -100
echo "..."

pause

# =============================================================================
# PART 5: Multi-Agent Curriculum (Recommended)
# =============================================================================

echo_header "Part 5: Multi-Agent Curriculum Generation"

echo_step "groot grow \"Python Data Structures\" --debug"
echo_info "This uses ALL three agents:"
echo "  1. Seedling generates the curriculum structure"
echo "  2. Canopy reviews for technical feasibility"
echo "  3. Bark reviews for pedagogical soundness"
echo "  4. Orchestrator merges feedback"
echo ""

# Reset for new curriculum
rm -f .groot/curriculum.json

groot grow "Python Data Structures" --debug

pause

# =============================================================================
# PART 6: Interactive Curriculum Generation
# =============================================================================

echo_header "Part 6: Interactive Curriculum Generation"

echo_step "groot plant \"Machine Learning Fundamentals\" --interactive"
echo_info "This asks you questions to personalize the curriculum:"
echo "  - Your experience level"
echo "  - Preferred learning style"
echo "  - Time commitment"
echo "  - Specific goals"
echo ""

# Note: This is interactive, so we'll just show the command
echo_info "Run this command to try interactive mode:"
echo -e "${GREEN}groot plant \"Machine Learning Fundamentals\" --interactive${NC}"

pause

# =============================================================================
# PART 7: Project Scaffolding
# =============================================================================

echo_header "Part 7: Project Scaffolding with Templates"

echo_info "Available templates:"
echo "  - typescript  : Node.js + TypeScript with Jest"
echo "  - javascript  : Node.js + JavaScript"
echo "  - python      : Python with pytest"
echo "  - react       : React + Vite + TypeScript"
echo "  - vue         : Vue 3 + Vite + TypeScript"
echo "  - minimal     : Basic structure only"
echo ""

pause

echo_step "groot seed --dry-run - Preview scaffolding without creating files"
groot seed --dry-run

pause

echo_step "groot seed --phase 1 --template typescript"
echo_info "Scaffolds Phase 1 with TypeScript + Jest template"
echo_info "Template choice is saved to curriculum for future phases!"
groot seed --phase 1 --template typescript

pause

echo_step "groot seed --phase 2 (no --template needed)"
echo_info "Uses saved template automatically - no need to specify again"
echo -e "${GREEN}groot seed --phase 2${NC}  # Would use typescript automatically"

pause

echo_step "Viewing generated project structure..."
tree . 2>/dev/null || find . -type f | head -30

pause

# =============================================================================
# PART 8: TDD + SDD Workflow
# =============================================================================

echo_header "Part 8: TDD + SDD Workflow (Test-Driven + Spec-Driven)"

echo_info "GROOT combines TDD and SDD:"
echo "  1. SEED: Generate failing tests + spec artifacts"
echo "  2. READ: Review specs for requirements"
echo "  3. RED: Run tests (they fail initially)"
echo "  4. IMPLEMENT: Use Claude Code/Copilot with specs"
echo "  5. GREEN: Tests pass"
echo "  6. REFACTOR: Clean up"
echo ""

pause

echo_step "groot seed --phase 1 --template python --tdd"
echo_info "This generates:"
echo "  - Failing tests for each deliverable"
echo "  - Spec artifacts (spec.md, plan.md, tasks.md)"
echo ""

# Show spec structure
echo_step "Spec artifacts are created in specs/phase-N/<deliverable>/"
ls -la specs/ 2>/dev/null || echo "(specs directory will be created)"

pause

# =============================================================================
# PART 9: Session Management
# =============================================================================

echo_header "Part 9: Learning Session Management"

echo_step "groot wake - Start a learning session"
echo_info "Sessions track your progress and context"
groot wake

pause

echo_step "groot wake --phase 2 - Start session for a specific phase"
echo_info "Jump directly to any phase"

pause

echo_step "groot status - Check your progress"
groot status

pause

# =============================================================================
# PART 10: Learning Tools
# =============================================================================

echo_header "Part 10: Learning & Tutoring"

echo_step "groot ask \"What is dependency injection?\""
echo_info "Ask the Bark (Tutor) agent any question"
groot ask "What is dependency injection?"

pause

echo_step "groot remember \"Key insight\" -c \"REST APIs use HTTP verbs for CRUD\""
echo_info "Capture learning notes in your journal"
groot remember "REST API insight" -c "REST APIs map HTTP verbs to CRUD: GET=Read, POST=Create, PUT=Update, DELETE=Delete"

pause

echo_step "groot remember --list - View all journal entries"
groot remember --list

pause

# =============================================================================
# PART 11: Phase Verification
# =============================================================================

echo_header "Part 11: Phase Verification & Testing"

echo_step "groot check - Verify phase completion via tests"
echo_info "Runs tests and validates spec artifacts exist"
groot check

pause

echo_step "groot check --phase 1 --update"
echo_info "Run tests and mark passing deliverables as complete"

pause

echo_step "groot check --specs-only"
echo_info "Only validate that spec artifacts exist (no test execution)"
groot check --specs-only

pause

# =============================================================================
# PART 12: Sync Project Files
# =============================================================================

echo_header "Part 12: Sync Project Files with Completion Status"

echo_step "groot sync - Sync README.md and OBJECTIVES.md with curriculum"
echo_info "Updates checkboxes to reflect completed deliverables"
groot sync

pause

echo_step "groot sync --phase 1 - Sync a specific phase"
groot sync --phase 1

pause

echo_step "groot sync --dry-run - Preview changes without writing"
groot sync --dry-run

pause

# =============================================================================
# PART 13: Solution Generation (SDD)
# =============================================================================

echo_header "Part 13: Spec-Driven Development (SDD)"

echo_step "groot solve --phase 1"
echo_info "Generate SDD spec artifacts for a phase:"
echo "  - spec.md: Feature specification"
echo "  - plan.md: Implementation approach"
echo "  - tasks.md: Step-by-step checklist"
groot solve --phase 1

pause

echo_step "groot solve --phase 1 --prompt"
echo_info "Get a ready-to-paste prompt for Claude Code"
groot solve --phase 1 --prompt

pause

echo_step "groot solve -d \"Specific Deliverable\" --prompt"
echo_info "Generate prompt for a specific deliverable"

pause

# =============================================================================
# PART 14: End Session
# =============================================================================

echo_header "Part 14: Ending Your Session"

echo_step "groot rest - End session with handoff summary"
echo_info "Creates a summary for continuing later"
groot rest

pause

echo_step "groot rest -q - Quick end (skip confirmation prompts)"
echo_info "For when you're in a hurry"

pause

# =============================================================================
# PART 15: Cleanup (When Done Learning)
# =============================================================================

echo_header "Part 15: Ship Your Project!"

echo_info "When you've mastered the topic and want to ship your code:"
echo ""
echo_step "rm -rf .groot/"
echo_info "Your code stays. Only GROOT data is removed."
echo "You now have a complete project built through guided learning!"

pause

# =============================================================================
# SUMMARY
# =============================================================================

echo_header "Demo Complete! (15 Parts) - Command Summary"

cat << 'EOF'
┌─────────────────────────────────────────────────────────────────┐
│                    GROOT Command Reference                       │
├─────────────────────────────────────────────────────────────────┤
│ SETUP                                                            │
│   groot init                        Initialize GROOT             │
│   groot config --list               View configuration           │
│   groot config --init               Create .grootrc              │
├─────────────────────────────────────────────────────────────────┤
│ CURRICULUM                                                       │
│   groot plant <topic>               Quick curriculum             │
│   groot plant <topic> --beads       With BEADS tasks            │
│   groot plant <topic> --interactive Personalized questions       │
│   groot grow <topic>                Multi-agent review           │
│   groot grow <topic> --debug        Show agent interactions      │
├─────────────────────────────────────────────────────────────────┤
│ SCAFFOLDING (template saved & reused automatically)              │
│   groot seed                        Select template (saved)      │
│   groot seed --phase N              Uses saved template          │
│   groot seed --phase N --template T Override saved template      │
│   groot seed --tdd                  Include failing tests        │
│   groot seed --dry-run              Preview without creating     │
├─────────────────────────────────────────────────────────────────┤
│ SESSIONS                                                         │
│   groot wake                        Start learning session       │
│   groot wake --phase N              Start at specific phase      │
│   groot rest                        End with handoff summary     │
│   groot rest -q                     Quick end                    │
│   groot status                      Show progress                │
├─────────────────────────────────────────────────────────────────┤
│ LEARNING                                                         │
│   groot ask <question>              Ask the tutor               │
│   groot remember <title> -c <text>  Save to journal             │
│   groot remember --list             View journal entries         │
├─────────────────────────────────────────────────────────────────┤
│ VERIFICATION & SDD                                               │
│   groot check                       Run tests + validate specs   │
│   groot check --phase N --update    Update completion status     │
│   groot check --specs-only          Validate specs only          │
│   groot solve --phase N             Generate spec artifacts      │
│   groot solve --phase N --prompt    Get Claude Code prompt       │
│   groot solve -d "name" --prompt    Prompt for deliverable       │
├─────────────────────────────────────────────────────────────────┤
│ SYNC                                                             │
│   groot sync                        Sync current phase files     │
│   groot sync --phase N              Sync specific phase          │
│   groot sync --dry-run              Preview changes              │
├─────────────────────────────────────────────────────────────────┤
│ TEMPLATES: typescript | javascript | python | react | vue        │
└─────────────────────────────────────────────────────────────────┘
EOF

echo ""
echo -e "${GREEN}\"We are Groot.\" — We grow together.${NC}"
echo ""

# Cleanup demo directory option
echo -e "${YELLOW}To clean up this demo:${NC}"
echo "  cd .. && rm -rf groot-demo"
echo ""
