/**
 * Project Scaffolding
 *
 * Generates project starter files based on curriculum phase deliverables.
 * Transforms curriculum metadata into code stubs and project structure.
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import {
  Curriculum,
  Phase,
  ScaffoldOptions,
  ScaffoldFile,
  ScaffoldResult,
  ScaffoldContext,
  ExtendedTemplateDefinition,
  HookDefinition,
} from '../types';
import { executeHooks, getHooksForTemplate, HookResult } from './hooks';
import { loadExtendedConfig } from './config';

// Forward declarations for template functions (implemented in templates/)
let getTemplateDefinition: (type: string) => import('../types').TemplateDefinition | ExtendedTemplateDefinition | undefined;
let getAvailableTemplates: () => string[];

/**
 * Initialize template system (called lazily to avoid circular deps)
 */
async function initTemplates(): Promise<void> {
  if (!getTemplateDefinition) {
    const templates = await import('../templates');
    getTemplateDefinition = templates.getTemplateDefinition;
    getAvailableTemplates = templates.getAvailableTemplates;
  }
}

/**
 * Extended scaffold options with hook control
 */
export interface ExtendedScaffoldOptions extends ScaffoldOptions {
  skipHooks?: boolean;
}

/**
 * Extended scaffold result with hook information
 */
export interface ExtendedScaffoldResult extends ScaffoldResult {
  hooksExecuted?: HookResult[];
}

/**
 * Generate scaffold files for a curriculum phase
 */
export async function scaffoldPhase(
  curriculum: Curriculum,
  options: ExtendedScaffoldOptions
): Promise<ExtendedScaffoldResult> {
  await initTemplates();

  const result: ExtendedScaffoldResult = {
    success: true,
    filesCreated: [],
    filesSkipped: [],
    errors: [],
  };

  // Find the phase
  const phase = curriculum.phases.find(p => p.number === options.phaseNumber);
  if (!phase) {
    result.success = false;
    result.errors.push(`Phase ${options.phaseNumber} not found in curriculum`);
    return result;
  }

  // Get template definition
  const template = getTemplateDefinition(options.templateType);
  if (!template) {
    result.success = false;
    result.errors.push(`Template "${options.templateType}" not found`);
    return result;
  }

  // Create scaffold context
  const context: ScaffoldContext = {
    curriculum,
    phase,
    template: options.templateType,
    outputDir: options.outputDir,
  };

  // Generate files from template
  const files = template.generateFiles(context);

  // Add common files (README, OBJECTIVES)
  files.push(...generateCommonFiles(context));

  // Process each file
  for (const file of files) {
    const fullPath = join(options.outputDir, file.path);

    if (options.dryRun) {
      result.filesCreated.push(fullPath);
      continue;
    }

    try {
      if (file.type === 'directory') {
        await ensureDirectory(fullPath);
        result.filesCreated.push(fullPath);
      } else {
        // Check if file exists
        if (existsSync(fullPath) && !options.force) {
          result.filesSkipped.push(fullPath);
          continue;
        }

        // Ensure parent directory exists
        await ensureDirectory(dirname(fullPath));

        // Write file
        await writeFile(fullPath, file.content, 'utf-8');
        result.filesCreated.push(fullPath);
      }
    } catch (error) {
      result.errors.push(`Failed to create ${fullPath}: ${error}`);
      result.success = false;
    }
  }

  // Execute post-scaffold hooks (if not skipped and not dry-run)
  if (!options.dryRun && !options.skipHooks && result.success) {
    const hookResults = await executePostScaffoldHooks(
      options.templateType,
      template as ExtendedTemplateDefinition,
      options.outputDir,
      options.verbose
    );

    result.hooksExecuted = hookResults;

    // Check for hook failures
    for (const hr of hookResults) {
      if (!hr.success && !hr.skipped && !hr.hook.continueOnError) {
        result.success = false;
        result.errors.push(`Hook "${hr.hook.name}" failed: ${hr.error || 'Unknown error'}`);
      }
    }
  }

  return result;
}

/**
 * Execute post-scaffold hooks for a template
 */
async function executePostScaffoldHooks(
  templateType: string,
  template: ExtendedTemplateDefinition,
  outputDir: string,
  verbose?: boolean
): Promise<HookResult[]> {
  // Load config to check for hook overrides
  let configHooks: Record<string, { enabled: boolean; hooks?: HookDefinition[] }> | undefined;

  try {
    const config = loadExtendedConfig();
    configHooks = config.hooks?.defaults;
  } catch {
    // Config loading failed - use defaults
  }

  // Get hooks for this template (considering config overrides)
  const hooks = getHooksForTemplate(templateType, configHooks);

  // Also check for template-defined hooks
  if (hooks.length === 0 && template.defaultHooks) {
    hooks.push(...template.defaultHooks);
  }

  if (hooks.length === 0) {
    return [];
  }

  // Execute hooks
  return executeHooks(hooks, outputDir, { verbose });
}

/**
 * Generate common files shared across all templates
 */
function generateCommonFiles(context: ScaffoldContext): ScaffoldFile[] {
  const { curriculum, phase } = context;
  const files: ScaffoldFile[] = [];

  // Generate README.md
  files.push({
    path: 'README.md',
    type: 'file',
    content: generateReadme(curriculum, phase),
  });

  // Generate OBJECTIVES.md with checklist
  files.push({
    path: 'OBJECTIVES.md',
    type: 'file',
    content: generateObjectives(phase),
  });

  return files;
}

/**
 * Generate README.md content
 */
function generateReadme(curriculum: Curriculum, phase: Phase): string {
  const stageName = phase.growthStage.charAt(0).toUpperCase() + phase.growthStage.slice(1);

  const content = `# ${curriculum.title} - Phase ${phase.number}: ${phase.title}

> ${phase.description}

## Growth Stage: ${stageName}

Estimated time: ${phase.estimatedHours} hours

## Learning Objectives

${phase.objectives.map((obj, i) => `${i + 1}. ${obj.description}`).join('\n')}

## Deliverables

${phase.deliverables.map(del => `
### ${del.title}

${del.description}

**Acceptance Criteria:**
${del.acceptanceCriteria.map(c => `- [ ] ${c}`).join('\n')}
`).join('\n')}

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
 * Generate OBJECTIVES.md with checklist
 */
function generateObjectives(phase: Phase): string {
  const content = `# Phase ${phase.number} Objectives Checklist

Track your progress through this phase.

## Learning Objectives

${phase.objectives.map(obj => `- [ ] ${obj.description}`).join('\n')}

## Deliverables

${phase.deliverables.map(del => `
### ${del.title}

- [ ] Started
${del.acceptanceCriteria.map(c => `- [ ] ${c}`).join('\n')}
- [ ] Completed
`).join('\n')}

## Notes

_Add your learning notes here as you progress..._

`;

  return content;
}

/**
 * Generate file/folder name from deliverable title
 */
export function generateFileName(title: string, extension: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}${extension}`;
}

/**
 * Convert string to PascalCase for class names
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[\s\-_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert string to snake_case for Python
 */
export function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Generate TODO comments from acceptance criteria
 */
export function generateTodoComments(criteria: string[], commentStyle: '//' | '#'): string {
  return criteria.map(c => `${commentStyle} TODO: ${c}`).join('\n');
}

/**
 * Ensure directory exists
 */
async function ensureDirectory(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Get available template types
 */
export async function getAvailableTemplateTypes(): Promise<string[]> {
  await initTemplates();
  return getAvailableTemplates();
}

/**
 * Get template definition by type
 */
export async function getTemplate(type: string): Promise<import('../types').TemplateDefinition | ExtendedTemplateDefinition | undefined> {
  await initTemplates();
  return getTemplateDefinition(type);
}

/**
 * Validate scaffold options
 */
export function validateScaffoldOptions(options: Partial<ScaffoldOptions>): string[] {
  const errors: string[] = [];

  if (options.phaseNumber !== undefined && options.phaseNumber < 1) {
    errors.push('Phase number must be at least 1');
  }

  return errors;
}
