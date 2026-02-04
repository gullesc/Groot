/**
 * Sync Module
 *
 * Synchronizes README.md and OBJECTIVES.md with curriculum completion status.
 * Updates checkboxes to reflect which deliverables have been completed.
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { Curriculum, Phase, Deliverable } from '../types';

export interface SyncOptions {
  outputDir: string;
  verbose?: boolean;
  dryRun?: boolean;
}

export interface SyncResult {
  readmeUpdated: boolean;
  objectivesUpdated: boolean;
  filesModified: string[];
  errors: string[];
}

/**
 * Sync README.md and OBJECTIVES.md with curriculum completion status
 */
export async function syncWithCurriculum(
  curriculum: Curriculum,
  phase: Phase,
  options: SyncOptions
): Promise<SyncResult> {
  const result: SyncResult = {
    readmeUpdated: false,
    objectivesUpdated: false,
    filesModified: [],
    errors: [],
  };

  const readmePath = join(options.outputDir, 'README.md');
  const objectivesPath = join(options.outputDir, 'OBJECTIVES.md');

  // Sync README.md
  if (existsSync(readmePath)) {
    try {
      const content = await readFile(readmePath, 'utf-8');
      const updated = updateReadmeCheckboxes(content, phase);

      if (updated !== content) {
        if (!options.dryRun) {
          await writeFile(readmePath, updated, 'utf-8');
        }
        result.readmeUpdated = true;
        result.filesModified.push(readmePath);
        if (options.verbose) {
          console.log(`${options.dryRun ? '[dry-run] Would update' : 'Updated'}: ${readmePath}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to update README.md: ${error}`);
    }
  }

  // Sync OBJECTIVES.md
  if (existsSync(objectivesPath)) {
    try {
      const content = await readFile(objectivesPath, 'utf-8');
      const updated = updateObjectivesCheckboxes(content, phase);

      if (updated !== content) {
        if (!options.dryRun) {
          await writeFile(objectivesPath, updated, 'utf-8');
        }
        result.objectivesUpdated = true;
        result.filesModified.push(objectivesPath);
        if (options.verbose) {
          console.log(`${options.dryRun ? '[dry-run] Would update' : 'Updated'}: ${objectivesPath}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to update OBJECTIVES.md: ${error}`);
    }
  }

  return result;
}

/**
 * Update checkboxes in README.md based on deliverable completion
 */
function updateReadmeCheckboxes(content: string, phase: Phase): string {
  let updated = content;

  for (const deliverable of phase.deliverables) {
    if (deliverable.completed) {
      // Update all acceptance criteria for this deliverable to checked
      updated = updateDeliverableSection(updated, deliverable, true);
    }
  }

  // Also update learning objectives if they're completed
  for (const objective of phase.objectives) {
    if (objective.completed) {
      updated = updateObjectiveCheckbox(updated, objective.description, true);
    }
  }

  return updated;
}

/**
 * Update checkboxes in OBJECTIVES.md based on deliverable completion
 */
function updateObjectivesCheckboxes(content: string, phase: Phase): string {
  let updated = content;

  for (const deliverable of phase.deliverables) {
    if (deliverable.completed) {
      // Update the deliverable section - mark Started, all criteria, and Completed
      updated = updateDeliverableSection(updated, deliverable, true);
      // Also mark the "Started" and "Completed" checkboxes
      updated = markDeliverableStartedAndCompleted(updated, deliverable.title);
    }
  }

  // Also update learning objectives if they're completed
  for (const objective of phase.objectives) {
    if (objective.completed) {
      updated = updateObjectiveCheckbox(updated, objective.description, true);
    }
  }

  return updated;
}

/**
 * Update checkboxes for a specific deliverable's acceptance criteria
 */
function updateDeliverableSection(
  content: string,
  deliverable: Deliverable,
  checked: boolean
): string {
  let updated = content;

  // Find the deliverable section and update its acceptance criteria
  for (const criterion of deliverable.acceptanceCriteria) {
    const escapedCriterion = escapeRegex(criterion);

    // Match unchecked checkbox with this criterion
    const uncheckedPattern = new RegExp(
      `- \\[ \\] ${escapedCriterion}`,
      'g'
    );

    // Match checked checkbox with this criterion (to avoid double-checking)
    const checkedPattern = new RegExp(
      `- \\[x\\] ${escapedCriterion}`,
      'gi'
    );

    if (checked) {
      // Only update if not already checked
      if (!checkedPattern.test(updated)) {
        updated = updated.replace(uncheckedPattern, `- [x] ${criterion}`);
      }
    } else {
      // Uncheck (for future use if needed)
      updated = updated.replace(checkedPattern, `- [ ] ${criterion}`);
    }
  }

  return updated;
}

/**
 * Mark the "Started" and "Completed" checkboxes for a deliverable in OBJECTIVES.md
 */
function markDeliverableStartedAndCompleted(content: string, deliverableTitle: string): string {
  let updated = content;

  // Find the section for this deliverable and mark Started/Completed
  const titlePattern = new RegExp(`### ${escapeRegex(deliverableTitle)}`, 'i');
  const titleMatch = content.match(titlePattern);

  if (titleMatch && titleMatch.index !== undefined) {
    // Find the next section or end of file
    const sectionStart = titleMatch.index;
    const nextSectionMatch = content.slice(sectionStart + 1).match(/\n### /);
    const sectionEnd = nextSectionMatch
      ? sectionStart + 1 + nextSectionMatch.index!
      : content.length;

    const section = content.slice(sectionStart, sectionEnd);

    // Update Started and Completed checkboxes within this section
    let updatedSection = section
      .replace(/- \[ \] Started/g, '- [x] Started')
      .replace(/- \[ \] Completed/g, '- [x] Completed');

    updated = content.slice(0, sectionStart) + updatedSection + content.slice(sectionEnd);
  }

  return updated;
}

/**
 * Update a learning objective checkbox
 */
function updateObjectiveCheckbox(
  content: string,
  description: string,
  checked: boolean
): string {
  const escapedDescription = escapeRegex(description);

  if (checked) {
    const pattern = new RegExp(`- \\[ \\] ${escapedDescription}`, 'g');
    return content.replace(pattern, `- [x] ${description}`);
  } else {
    const pattern = new RegExp(`- \\[x\\] ${escapedDescription}`, 'gi');
    return content.replace(pattern, `- [ ] ${description}`);
  }
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate a fresh README.md with current completion status
 * (Alternative approach: regenerate rather than patch)
 */
export function generateSyncedReadme(curriculum: Curriculum, phase: Phase): string {
  const stageName = phase.growthStage.charAt(0).toUpperCase() + phase.growthStage.slice(1);

  const content = `# ${curriculum.title} - Phase ${phase.number}: ${phase.title}

> ${phase.description}

## Growth Stage: ${stageName}

Estimated time: ${phase.estimatedHours} hours

## Learning Objectives

${phase.objectives.map((obj, i) => {
  const checkbox = obj.completed ? '[x]' : '[ ]';
  return `${i + 1}. ${checkbox} ${obj.description}`;
}).join('\n')}

## Deliverables

${phase.deliverables.map(del => {
  const status = del.completed ? '(Completed)' : '';
  return `
### ${del.title} ${status}

${del.description}

**Acceptance Criteria:**
${del.acceptanceCriteria.map(c => {
  const checkbox = del.completed ? '[x]' : '[ ]';
  return `- ${checkbox} ${c}`;
}).join('\n')}
`;
}).join('\n')}

## Key Concepts

${phase.keyConcepts.map(c => `
### ${c.term}

${c.definition}
`).join('\n')}

---

*Generated by GROOT - Guided Resource for Organized Objective Training*
`;

  return content;
}

/**
 * Generate a fresh OBJECTIVES.md with current completion status
 */
export function generateSyncedObjectives(phase: Phase): string {
  const content = `# Phase ${phase.number} Objectives Checklist

Track your progress through this phase.

## Learning Objectives

${phase.objectives.map(obj => {
  const checkbox = obj.completed ? '[x]' : '[ ]';
  return `- ${checkbox} ${obj.description}`;
}).join('\n')}

## Deliverables

${phase.deliverables.map(del => {
  const startedBox = del.completed ? '[x]' : '[ ]';
  const completedBox = del.completed ? '[x]' : '[ ]';
  return `
### ${del.title}

- ${startedBox} Started
${del.acceptanceCriteria.map(c => {
  const checkbox = del.completed ? '[x]' : '[ ]';
  return `- ${checkbox} ${c}`;
}).join('\n')}
- ${completedBox} Completed
`;
}).join('\n')}

## Notes

_Add your learning notes here as you progress..._

`;

  return content;
}

/**
 * Full sync that regenerates files from curriculum state
 * (More reliable than patching existing files)
 */
export async function fullSyncWithCurriculum(
  curriculum: Curriculum,
  phase: Phase,
  options: SyncOptions
): Promise<SyncResult> {
  const result: SyncResult = {
    readmeUpdated: false,
    objectivesUpdated: false,
    filesModified: [],
    errors: [],
  };

  const readmePath = join(options.outputDir, 'README.md');
  const objectivesPath = join(options.outputDir, 'OBJECTIVES.md');

  // Regenerate README.md
  if (existsSync(readmePath)) {
    try {
      const currentContent = await readFile(readmePath, 'utf-8');
      const newContent = generateSyncedReadme(curriculum, phase);

      // Only update if content changed (comparing normalized content)
      if (normalizeContent(currentContent) !== normalizeContent(newContent)) {
        if (!options.dryRun) {
          await writeFile(readmePath, newContent, 'utf-8');
        }
        result.readmeUpdated = true;
        result.filesModified.push(readmePath);
        if (options.verbose) {
          console.log(`${options.dryRun ? '[dry-run] Would update' : 'Updated'}: ${readmePath}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to update README.md: ${error}`);
    }
  }

  // Regenerate OBJECTIVES.md
  if (existsSync(objectivesPath)) {
    try {
      const currentContent = await readFile(objectivesPath, 'utf-8');
      const newContent = generateSyncedObjectives(phase);

      if (normalizeContent(currentContent) !== normalizeContent(newContent)) {
        if (!options.dryRun) {
          await writeFile(objectivesPath, newContent, 'utf-8');
        }
        result.objectivesUpdated = true;
        result.filesModified.push(objectivesPath);
        if (options.verbose) {
          console.log(`${options.dryRun ? '[dry-run] Would update' : 'Updated'}: ${objectivesPath}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to update OBJECTIVES.md: ${error}`);
    }
  }

  return result;
}

/**
 * Normalize content for comparison (ignore whitespace differences)
 */
function normalizeContent(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}
