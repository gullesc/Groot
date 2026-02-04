/**
 * Solver Module
 *
 * Generates SDD artifacts (specs, plans, tasks) for deliverables.
 * This is the "answer key" generator that helps students who get stuck.
 *
 * Note: This module was refactored from direct code generation to
 * spec-driven development. Students use Claude Code or GitHub Copilot
 * to implement code from the generated specs.
 */

import { Curriculum, Phase, Deliverable, TemplateType } from '../types';
import {
  generateSpecsForDeliverable,
  specsExistForDeliverable,
  specsExistForPhase,
} from './spec-generator';
import {
  generateClaudeCodePrompt,
  generateCopilotPrompt,
  generatePhasePrompt,
  generateQuickPrompt,
} from './prompt-generator';
import { getDeliverableSpecDir, toDeliverableSlug } from './paths';

// Re-export types for backwards compatibility
export interface SolveOptions {
  outputDir: string;
  curriculum: Curriculum;
  templateType: TemplateType;
  dryRun?: boolean;
  verbose?: boolean;
  force?: boolean;      // Overwrite existing specs
  promptOnly?: boolean; // Just generate prompt, don't create specs
}

export interface SolveResult {
  deliverableTitle: string;
  deliverableId?: string;
  specDir?: string;
  filesCreated: string[];
  filesSkipped: string[];
  specsGenerated: boolean;
  prompt?: string;
  error?: string;
}

export interface PhaseSolveResults {
  phase: number;
  results: SolveResult[];
  success: boolean;
  error?: string;
}

/**
 * Generate specs (or prompt) for a single deliverable
 */
export async function solveDeliverable(
  deliverable: Deliverable,
  phase: Phase,
  options: SolveOptions
): Promise<SolveResult> {
  const { outputDir, curriculum, templateType, dryRun, verbose, force, promptOnly } = options;

  const result: SolveResult = {
    deliverableTitle: deliverable.title,
    deliverableId: deliverable.id,
    filesCreated: [],
    filesSkipped: [],
    specsGenerated: false,
  };

  const slug = toDeliverableSlug(deliverable.title);
  result.specDir = getDeliverableSpecDir(phase.number, slug, outputDir);

  // If promptOnly, just generate the prompt
  if (promptOnly) {
    result.prompt = generateClaudeCodePrompt(deliverable, phase, outputDir, templateType);
    return result;
  }

  // Check if specs already exist
  if (!force && specsExistForDeliverable(deliverable.title, phase.number, outputDir)) {
    result.filesSkipped.push(`${result.specDir}/spec.md`);
    result.filesSkipped.push(`${result.specDir}/plan.md`);
    result.filesSkipped.push(`${result.specDir}/tasks.md`);
    if (verbose) {
      console.log(`Specs already exist for: ${deliverable.title}`);
    }
    // Still generate prompt for display
    result.prompt = generateClaudeCodePrompt(deliverable, phase, outputDir, templateType);
    return result;
  }

  // Generate specs
  try {
    const specResult = await generateSpecsForDeliverable(deliverable, phase, {
      outputDir,
      phaseNumber: phase.number,
      curriculum,
      templateType,
      dryRun,
      verbose,
      force,
    });

    result.filesCreated = specResult.filesCreated;
    result.filesSkipped = specResult.filesSkipped;
    result.specsGenerated = specResult.filesCreated.length > 0;
    result.error = specResult.error;

    // Generate prompt for display
    result.prompt = generateClaudeCodePrompt(deliverable, phase, outputDir, templateType);
  } catch (error) {
    result.error = String(error);
  }

  return result;
}

/**
 * Generate specs for all deliverables in a phase
 */
export async function solvePhase(
  phase: Phase,
  options: SolveOptions
): Promise<PhaseSolveResults> {
  const results: SolveResult[] = [];

  for (const deliverable of phase.deliverables) {
    const result = await solveDeliverable(deliverable, phase, options);
    results.push(result);
  }

  return {
    phase: phase.number,
    results,
    success: results.every(r => !r.error),
    error: results.find(r => r.error)?.error,
  };
}

/**
 * Check if specs already exist for a phase
 */
export function specsExist(phase: Phase, outputDir: string): boolean {
  return specsExistForPhase(phase, outputDir);
}

/**
 * Get the Claude Code prompt for a deliverable
 */
export function getPrompt(
  deliverable: Deliverable,
  phase: Phase,
  outputDir: string,
  templateType: TemplateType,
  format: 'claude' | 'copilot' | 'quick' = 'claude'
): string {
  switch (format) {
    case 'copilot':
      return generateCopilotPrompt(deliverable, phase, outputDir, templateType);
    case 'quick':
      return generateQuickPrompt(deliverable, templateType);
    case 'claude':
    default:
      return generateClaudeCodePrompt(deliverable, phase, outputDir, templateType);
  }
}

/**
 * Get the Claude Code prompt for an entire phase
 */
export function getPhasePrompt(
  phase: Phase,
  outputDir: string,
  templateType: TemplateType
): string {
  return generatePhasePrompt(phase, outputDir, templateType);
}
