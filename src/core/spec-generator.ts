/**
 * Spec Generator
 *
 * Generates SDD artifacts (spec.md, plan.md, tasks.md) for deliverables.
 * Uses Claude API to produce structured, completed specifications.
 */

import Anthropic from '@anthropic-ai/sdk';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  Curriculum,
  Phase,
  Deliverable,
  TemplateType,
  SpecArtifacts,
  SpecGenerationOptions,
  SpecGenerationResult,
  PhaseSpecResults,
} from '../types';
import { loadConfig } from './config';
import {
  getDeliverableSpecDir,
  getPhaseSpecsDir,
  toDeliverableSlug,
} from './paths';
import { writeConstitution } from './constitution-generator';

/**
 * Parse the Claude API response into separate spec artifacts
 */
function parseSpecResponse(text: string): SpecArtifacts {
  const specMatch = text.match(/--- SPEC ---\n([\s\S]*?)(?=--- PLAN ---|$)/);
  const planMatch = text.match(/--- PLAN ---\n([\s\S]*?)(?=--- TASKS ---|$)/);
  const tasksMatch = text.match(/--- TASKS ---\n([\s\S]*?)$/);

  return {
    spec: (specMatch?.[1] || '').trim(),
    plan: (planMatch?.[1] || '').trim(),
    tasks: (tasksMatch?.[1] || '').trim(),
  };
}

/**
 * Get the source file path pattern for a deliverable
 */
function getSourceFilePath(deliverableTitle: string, templateType: TemplateType): string {
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
 * Get the test file path pattern for a deliverable
 */
function getTestFilePath(deliverableTitle: string, templateType: TemplateType): string {
  const slug = toDeliverableSlug(deliverableTitle);
  switch (templateType) {
    case 'python':
      return `tests/test_${slug.replace(/-/g, '_')}.py`;
    case 'typescript':
      return `tests/${slug}.test.ts`;
    case 'javascript':
      return `tests/${slug}.test.js`;
    default:
      return `tests/${slug}.test`;
  }
}

/**
 * Build the prompt for Claude to generate spec artifacts
 */
function buildSpecPrompt(
  deliverable: Deliverable,
  phase: Phase,
  curriculum: Curriculum,
  templateType: TemplateType
): string {
  const sourceFile = getSourceFilePath(deliverable.title, templateType);
  const testFile = getTestFilePath(deliverable.title, templateType);
  const languageName = getLanguageName(templateType);

  return `You are generating spec-driven development (SDD) artifacts for a learning curriculum project.

PROJECT CONTEXT:
- Curriculum: ${curriculum.title}
- Topic: ${curriculum.topic}
- Difficulty: ${curriculum.metadata.difficulty}
- Language: ${languageName}
- Restrictions: Standard library only (no external dependencies)

PHASE CONTEXT:
- Phase ${phase.number}: ${phase.title}
- Description: ${phase.description}
- Learning Objectives:
${phase.objectives.map((obj, i) => `  ${i + 1}. ${obj.description}`).join('\n')}
- Key Concepts:
${phase.keyConcepts.map(kc => `  - ${kc.term}: ${kc.definition}`).join('\n')}

DELIVERABLE: ${deliverable.title}
DESCRIPTION: ${deliverable.description}

ACCEPTANCE CRITERIA:
${deliverable.acceptanceCriteria.map((ac, i) => `${i + 1}. ${ac}`).join('\n')}

EXISTING PROJECT STRUCTURE:
- Source stub: ${sourceFile}
- Test file: ${testFile}
- The source stub contains a class with an execute() method and a factory function

---

Generate THREE complete markdown documents separated by the markers shown below.
Each document should be COMPLETE and SELF-CONTAINED.
Do NOT include the markers in the content itself — they are separators only.

--- SPEC ---
# Feature Spec: ${deliverable.title}

## Overview
[2-3 paragraphs explaining what this feature does and why it matters in the context of ${curriculum.topic}]

## Requirements

### Functional Requirements
[Numbered list derived from acceptance criteria, expanded with implementation details]

### Non-Functional Requirements
- Must use only the ${languageName} standard library
- Must work with the existing project structure
- Code must be educational and well-commented

## Interface

### Input
[Description of what inputs the implementation accepts]

### Output
[Description of what outputs the implementation produces]

## Acceptance Criteria
${deliverable.acceptanceCriteria.map(ac => `- [ ] ${ac}`).join('\n')}

## Examples
[Concrete examples showing expected behavior with sample inputs and outputs]

## Dependencies
- Source file: \`${sourceFile}\`
- Test file: \`${testFile}\`

--- PLAN ---
# Implementation Plan: ${deliverable.title}

## Approach
[2-3 paragraphs describing the implementation strategy, considering this is an educational project]

## Architecture

### Key Components
[List the main classes, functions, or modules needed]

### Data Flow
[Describe how data moves through the implementation]

## Implementation Steps
[High-level steps with details under each]

## Key Decisions
[Technical decisions with rationale, keeping in mind this is for learning]

## Testing Strategy
- Tests are already provided in \`${testFile}\`
- Run with: \`${getTestCommand(templateType)}\`
- Tests verify each acceptance criterion

## Edge Cases
[List edge cases to handle]

--- TASKS ---
# Tasks: ${deliverable.title}

## Prerequisites
- [ ] Read spec.md to understand requirements
- [ ] Read plan.md to understand the approach
- [ ] Run tests to see them fail: \`${getTestCommand(templateType)}\`

## Implementation Tasks

[Generate 4-8 specific tasks, each with:]
- [ ] **Task N**: [Specific implementation step]
  - File: \`${sourceFile}\`
  - Details: [What to implement in 1-2 sentences]

## Verification
- [ ] All tests pass: \`${getTestCommand(templateType)}\`
- [ ] Code follows project constitution
- [ ] No external dependencies added
- [ ] Code includes helpful comments`;
}

/**
 * Get language name for display
 */
function getLanguageName(templateType: TemplateType): string {
  switch (templateType) {
    case 'python': return 'Python';
    case 'typescript': return 'TypeScript';
    case 'javascript': return 'JavaScript';
    case 'react': return 'React/TypeScript';
    case 'vue': return 'Vue/TypeScript';
    default: return templateType;
  }
}

/**
 * Get test command for template type
 */
function getTestCommand(templateType: TemplateType): string {
  switch (templateType) {
    case 'python': return 'python3 -m pytest -v';
    case 'typescript':
    case 'javascript':
    case 'react':
    case 'vue':
      return 'npm test';
    default: return 'npm test';
  }
}

/**
 * Generate specs for a single deliverable
 */
export async function generateSpecsForDeliverable(
  deliverable: Deliverable,
  phase: Phase,
  options: SpecGenerationOptions
): Promise<SpecGenerationResult> {
  const { curriculum, templateType, outputDir, dryRun, verbose, force } = options;

  const result: SpecGenerationResult = {
    deliverableTitle: deliverable.title,
    deliverableId: deliverable.id,
    filesCreated: [],
    filesSkipped: [],
  };

  const slug = toDeliverableSlug(deliverable.title);
  const specDir = getDeliverableSpecDir(phase.number, slug, outputDir);
  result.specDir = specDir;

  const specPath = join(specDir, 'spec.md');
  const planPath = join(specDir, 'plan.md');
  const tasksPath = join(specDir, 'tasks.md');

  // Check if specs already exist
  if (!force && existsSync(specPath) && existsSync(planPath) && existsSync(tasksPath)) {
    result.filesSkipped.push(specPath, planPath, tasksPath);
    if (verbose) {
      console.log(`Skipping ${deliverable.title} (specs already exist)`);
    }
    return result;
  }

  try {
    const config = loadConfig();
    const client = new Anthropic({ apiKey: config.anthropicApiKey });

    const prompt = buildSpecPrompt(deliverable, phase, curriculum, templateType);

    if (verbose) {
      console.log(`Generating specs for: ${deliverable.title}`);
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    const artifacts = parseSpecResponse(content.text);

    // Validate we got all three artifacts
    if (!artifacts.spec || !artifacts.plan || !artifacts.tasks) {
      throw new Error('Failed to parse all spec artifacts from response');
    }

    if (!dryRun) {
      // Ensure spec directory exists
      if (!existsSync(specDir)) {
        await mkdir(specDir, { recursive: true });
      }

      // Write spec files
      await writeFile(specPath, artifacts.spec, 'utf-8');
      result.filesCreated.push(specPath);

      await writeFile(planPath, artifacts.plan, 'utf-8');
      result.filesCreated.push(planPath);

      await writeFile(tasksPath, artifacts.tasks, 'utf-8');
      result.filesCreated.push(tasksPath);

      if (verbose) {
        console.log(`  Created: ${specPath}`);
        console.log(`  Created: ${planPath}`);
        console.log(`  Created: ${tasksPath}`);
      }
    } else {
      if (verbose) {
        console.log(`  [dry-run] Would create: ${specPath}`);
        console.log(`  [dry-run] Would create: ${planPath}`);
        console.log(`  [dry-run] Would create: ${tasksPath}`);
      }
    }
  } catch (error) {
    result.error = String(error);
    if (verbose) {
      console.error(`  Error: ${result.error}`);
    }
  }

  return result;
}

/**
 * Generate specs for all deliverables in a phase
 */
export async function generateSpecsForPhase(
  phase: Phase,
  options: SpecGenerationOptions
): Promise<PhaseSpecResults> {
  const results: SpecGenerationResult[] = [];
  let constitutionGenerated = false;

  // Generate constitution first (if it doesn't exist)
  if (!options.dryRun) {
    try {
      const constitutionPath = await writeConstitution({
        curriculum: options.curriculum,
        templateType: options.templateType,
        outputDir: options.outputDir,
      });
      constitutionGenerated = true;
      if (options.verbose) {
        console.log(`Created constitution: ${constitutionPath}`);
      }
    } catch (error) {
      if (options.verbose) {
        console.error(`Failed to create constitution: ${error}`);
      }
    }
  }

  // Ensure phase specs directory exists
  const phaseSpecsDir = getPhaseSpecsDir(phase.number, options.outputDir);
  if (!options.dryRun && !existsSync(phaseSpecsDir)) {
    await mkdir(phaseSpecsDir, { recursive: true });
  }

  // Generate specs for each deliverable
  for (const deliverable of phase.deliverables) {
    const result = await generateSpecsForDeliverable(deliverable, phase, options);
    results.push(result);
  }

  return {
    phase: phase.number,
    results,
    constitutionGenerated,
    success: results.every(r => !r.error),
    error: results.find(r => r.error)?.error,
  };
}

/**
 * Check if specs exist for a deliverable
 */
export function specsExistForDeliverable(
  deliverableTitle: string,
  phaseNumber: number,
  outputDir: string
): boolean {
  const slug = toDeliverableSlug(deliverableTitle);
  const specDir = getDeliverableSpecDir(phaseNumber, slug, outputDir);

  return (
    existsSync(join(specDir, 'spec.md')) &&
    existsSync(join(specDir, 'plan.md')) &&
    existsSync(join(specDir, 'tasks.md'))
  );
}

/**
 * Check if specs exist for all deliverables in a phase
 */
export function specsExistForPhase(
  phase: Phase,
  outputDir: string
): boolean {
  return phase.deliverables.every(d =>
    specsExistForDeliverable(d.title, phase.number, outputDir)
  );
}
