/**
 * Prompt Generator
 *
 * Generates ready-to-paste prompts for Claude Code or GitHub Copilot.
 * Helps students quickly start implementing with AI assistance.
 */

import { join } from 'path';
import { Phase, Deliverable, TemplateType } from '../types';
import { getDeliverableSpecDir, toDeliverableSlug } from './paths';

/**
 * Generate a Claude Code prompt for implementing a deliverable
 */
export function generateClaudeCodePrompt(
  deliverable: Deliverable,
  phase: Phase,
  outputDir: string,
  templateType: TemplateType
): string {
  const slug = toDeliverableSlug(deliverable.title);
  const specDir = getDeliverableSpecDir(phase.number, slug, outputDir);
  const relativeSpecDir = `specs/phase-${phase.number}/${slug}`;

  const sourceFile = getSourceFile(deliverable.title, templateType);
  const testCommand = getTestCommand(templateType);

  return `Please implement the "${deliverable.title}" feature for this ${templateType} project.

## Context

This is part of Phase ${phase.number}: ${phase.title}
${phase.description}

## Specification Files

Read these files for full details:
- Spec: ${relativeSpecDir}/spec.md
- Plan: ${relativeSpecDir}/plan.md
- Tasks: ${relativeSpecDir}/tasks.md

## Acceptance Criteria

${deliverable.acceptanceCriteria.map((ac, i) => `${i + 1}. ${ac}`).join('\n')}

## Implementation Instructions

1. Read the spec.md to understand requirements
2. Review plan.md for the implementation approach
3. Implement the code in \`${sourceFile}\`
4. Follow the tasks.md checklist
5. Run tests to verify: \`${testCommand}\`

## Constraints

- Use only the standard library (no external dependencies)
- Preserve the existing class structure and factory function
- Keep code educational with helpful comments
- Make all tests pass

Please start by reading the spec files, then implement the solution.`;
}

/**
 * Generate a GitHub Copilot prompt for implementing a deliverable
 */
export function generateCopilotPrompt(
  deliverable: Deliverable,
  phase: Phase,
  outputDir: string,
  templateType: TemplateType
): string {
  const slug = toDeliverableSlug(deliverable.title);
  const relativeSpecDir = `specs/phase-${phase.number}/${slug}`;
  const sourceFile = getSourceFile(deliverable.title, templateType);

  return `# Copilot Implementation Guide: ${deliverable.title}

## Open these files for context:
1. ${relativeSpecDir}/spec.md - Feature requirements
2. ${relativeSpecDir}/plan.md - Implementation approach
3. ${relativeSpecDir}/tasks.md - Step-by-step checklist
4. ${sourceFile} - Source file to implement

## Quick Summary

${deliverable.description}

## Acceptance Criteria

${deliverable.acceptanceCriteria.map((ac, i) => `- [ ] ${ac}`).join('\n')}

## Implementation Tips

- The source file has a stub class with TODOs
- Implement the execute() method
- Use only standard library
- Check tasks.md for detailed steps`;
}

/**
 * Generate a combined prompt for all deliverables in a phase
 */
export function generatePhasePrompt(
  phase: Phase,
  outputDir: string,
  templateType: TemplateType
): string {
  const testCommand = getTestCommand(templateType);

  const deliverableSections = phase.deliverables.map((d, i) => {
    const slug = toDeliverableSlug(d.title);
    const relativeSpecDir = `specs/phase-${phase.number}/${slug}`;
    const sourceFile = getSourceFile(d.title, templateType);

    return `### ${i + 1}. ${d.title}

**Description**: ${d.description}

**Spec files**: ${relativeSpecDir}/
**Source file**: ${sourceFile}

**Acceptance Criteria**:
${d.acceptanceCriteria.map(ac => `- ${ac}`).join('\n')}`;
  }).join('\n\n');

  return `# Phase ${phase.number}: ${phase.title}

${phase.description}

## Deliverables to Implement

${deliverableSections}

## Implementation Workflow

For each deliverable:
1. Read spec.md for requirements
2. Review plan.md for approach
3. Follow tasks.md checklist
4. Implement in the source file
5. Run tests: \`${testCommand}\`

## Constraints

- Standard library only (no external dependencies)
- Preserve existing class structures
- Keep code educational
- Make all tests pass before moving to the next deliverable`;
}

/**
 * Generate a short prompt for quick implementation
 */
export function generateQuickPrompt(
  deliverable: Deliverable,
  templateType: TemplateType
): string {
  const sourceFile = getSourceFile(deliverable.title, templateType);

  return `Implement "${deliverable.title}" in ${sourceFile}.

Requirements:
${deliverable.acceptanceCriteria.map((ac, i) => `${i + 1}. ${ac}`).join('\n')}

Constraints: Standard library only, preserve class structure, include comments.`;
}

/**
 * Get source file path for a deliverable
 */
function getSourceFile(deliverableTitle: string, templateType: TemplateType): string {
  const slug = toDeliverableSlug(deliverableTitle);
  switch (templateType) {
    case 'python':
      return `src/${slug.replace(/-/g, '_')}.py`;
    case 'typescript':
      return `src/${slug}.ts`;
    case 'javascript':
      return `src/${slug}.js`;
    default:
      return `src/${slug}`;
  }
}

/**
 * Get test command for template type
 */
function getTestCommand(templateType: TemplateType): string {
  switch (templateType) {
    case 'python':
      return 'python3 -m pytest -v';
    case 'typescript':
    case 'javascript':
    case 'react':
    case 'vue':
      return 'npm test';
    default:
      return 'npm test';
  }
}

/**
 * Format a prompt for terminal display (with box drawing)
 */
export function formatPromptForDisplay(prompt: string, title: string): string {
  const width = 72;
  const horizontalLine = '─'.repeat(width);

  const lines = [
    `┌${horizontalLine}┐`,
    `│ ${title.padEnd(width - 1)}│`,
    `├${horizontalLine}┤`,
    ...prompt.split('\n').map(line => {
      const truncated = line.length > width - 2 ? line.substring(0, width - 5) + '...' : line;
      return `│ ${truncated.padEnd(width - 1)}│`;
    }),
    `└${horizontalLine}┘`,
  ];

  return lines.join('\n');
}
