/**
 * Spec Validator
 *
 * Validates that SDD artifacts exist and are well-formed for a given phase.
 * Used by `groot check` as Stage 1 validation before running tests.
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Phase, SpecValidationResult, PhaseSpecValidation } from '../types';
import {
  getDeliverableSpecDir,
  getConstitutionPath,
  toDeliverableSlug,
  hasConstitution,
} from './paths';

/**
 * Validate specs for a single deliverable
 */
export async function validateDeliverableSpecs(
  deliverableTitle: string,
  deliverableId: string | undefined,
  phaseNumber: number,
  outputDir: string
): Promise<SpecValidationResult> {
  const slug = toDeliverableSlug(deliverableTitle);
  const specDir = getDeliverableSpecDir(phaseNumber, slug, outputDir);

  const specPath = join(specDir, 'spec.md');
  const planPath = join(specDir, 'plan.md');
  const tasksPath = join(specDir, 'tasks.md');

  const result: SpecValidationResult = {
    deliverableTitle,
    deliverableId,
    specExists: existsSync(specPath),
    planExists: existsSync(planPath),
    tasksExists: existsSync(tasksPath),
    issues: [],
  };

  // Check if files exist
  if (!result.specExists) {
    result.issues.push(`Missing: ${specPath}`);
  }
  if (!result.planExists) {
    result.issues.push(`Missing: ${planPath}`);
  }
  if (!result.tasksExists) {
    result.issues.push(`Missing: ${tasksPath}`);
  }

  // If files exist, check they're not empty
  if (result.specExists) {
    try {
      const content = await readFile(specPath, 'utf-8');
      if (content.trim().length < 50) {
        result.issues.push(`spec.md appears empty or too short`);
      }
    } catch {
      result.issues.push(`Failed to read spec.md`);
    }
  }

  if (result.planExists) {
    try {
      const content = await readFile(planPath, 'utf-8');
      if (content.trim().length < 50) {
        result.issues.push(`plan.md appears empty or too short`);
      }
    } catch {
      result.issues.push(`Failed to read plan.md`);
    }
  }

  if (result.tasksExists) {
    try {
      const content = await readFile(tasksPath, 'utf-8');
      if (content.trim().length < 50) {
        result.issues.push(`tasks.md appears empty or too short`);
      }
    } catch {
      result.issues.push(`Failed to read tasks.md`);
    }
  }

  return result;
}

/**
 * Validate specs for all deliverables in a phase
 */
export async function validatePhaseSpecs(
  phase: Phase,
  outputDir: string
): Promise<PhaseSpecValidation> {
  const results: SpecValidationResult[] = [];

  // Check constitution
  const constitutionValid = hasConstitution(outputDir);
  const constitutionPath = getConstitutionPath(outputDir);

  // Validate each deliverable's specs
  for (const deliverable of phase.deliverables) {
    const result = await validateDeliverableSpecs(
      deliverable.title,
      deliverable.id,
      phase.number,
      outputDir
    );
    results.push(result);
  }

  // Determine overall validity
  const allDeliverableSpecsValid = results.every(
    r => r.specExists && r.planExists && r.tasksExists && r.issues.length === 0
  );

  return {
    phase: phase.number,
    constitutionValid,
    results,
    allValid: constitutionValid && allDeliverableSpecsValid,
  };
}

/**
 * Get a human-readable summary of spec validation results
 */
export function formatSpecValidationSummary(validation: PhaseSpecValidation): string {
  const lines: string[] = [];

  lines.push(`Phase ${validation.phase} Spec Validation:`);
  lines.push('');

  // Constitution status
  if (validation.constitutionValid) {
    lines.push('  ✓ Constitution exists');
  } else {
    lines.push('  ✗ Constitution missing');
  }

  lines.push('');

  // Deliverable status
  for (const result of validation.results) {
    const allPresent = result.specExists && result.planExists && result.tasksExists;
    const hasIssues = result.issues.length > 0;

    if (allPresent && !hasIssues) {
      lines.push(`  ✓ ${result.deliverableTitle}`);
    } else {
      lines.push(`  ✗ ${result.deliverableTitle}`);
      for (const issue of result.issues) {
        lines.push(`      - ${issue}`);
      }
    }
  }

  lines.push('');

  // Summary
  if (validation.allValid) {
    lines.push('  All specs valid ✓');
  } else {
    const missingCount = validation.results.filter(
      r => !r.specExists || !r.planExists || !r.tasksExists
    ).length;
    const issueCount = validation.results.reduce((sum, r) => sum + r.issues.length, 0);
    lines.push(`  Issues: ${missingCount} deliverables missing specs, ${issueCount} total issues`);
  }

  return lines.join('\n');
}

/**
 * Quick check if any specs exist for a phase (doesn't validate content)
 */
export function hasAnySpecs(phase: Phase, outputDir: string): boolean {
  for (const deliverable of phase.deliverables) {
    const slug = toDeliverableSlug(deliverable.title);
    const specDir = getDeliverableSpecDir(phase.number, slug, outputDir);
    if (existsSync(join(specDir, 'spec.md'))) {
      return true;
    }
  }
  return false;
}

/**
 * Check if all specs exist for a phase (doesn't validate content)
 */
export function allSpecsExist(phase: Phase, outputDir: string): boolean {
  for (const deliverable of phase.deliverables) {
    const slug = toDeliverableSlug(deliverable.title);
    const specDir = getDeliverableSpecDir(phase.number, slug, outputDir);
    if (
      !existsSync(join(specDir, 'spec.md')) ||
      !existsSync(join(specDir, 'plan.md')) ||
      !existsSync(join(specDir, 'tasks.md'))
    ) {
      return false;
    }
  }
  return true;
}
