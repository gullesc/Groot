/**
 * GROOT Plugin Discovery
 *
 * Discovers custom templates from user and project directories.
 * Custom templates are defined via template.yaml files.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import {
  ScaffoldContext,
  ScaffoldFile,
  CustomTemplateYaml,
  ExtendedTemplateDefinition,
} from '../types';
import { getUserTemplatesDir, getProjectTemplatesDir } from './paths';

/**
 * Convert string to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase());
}

/**
 * Simple template interpolation
 * Supports: {{ variable }}, {{ variable | filter }}
 */
function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expr) => {
    const [path, filter] = expr.split('|').map((s: string) => s.trim());
    const parts = path.split('.');

    let value: unknown = context;
    for (const part of parts) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return match; // Keep original if path not found
      }
      value = (value as Record<string, unknown>)[part];
    }

    if (value === undefined || value === null) {
      return '';
    }

    // Apply filter if present
    const strValue = String(value);
    switch (filter) {
      case 'kebabCase':
        return toKebabCase(strValue);
      case 'snakeCase':
        return toSnakeCase(strValue);
      case 'pascalCase':
        return toPascalCase(strValue);
      case 'toLowerCase':
        return strValue.toLowerCase();
      case 'toUpperCase':
        return strValue.toUpperCase();
      default:
        return strValue;
    }
  });
}

/**
 * Create a file generator function from YAML template definition
 */
function createGeneratorFromYaml(config: CustomTemplateYaml): (context: ScaffoldContext) => ScaffoldFile[] {
  return (context: ScaffoldContext): ScaffoldFile[] => {
    const files: ScaffoldFile[] = [];
    const { curriculum, phase } = context;

    // Build interpolation context
    const interpContext = {
      curriculum: {
        title: curriculum.title,
        description: curriculum.description,
        topic: curriculum.topic,
      },
      phase: {
        number: phase.number,
        title: phase.title,
        description: phase.description,
      },
    };

    // Generate static files
    if (config.files) {
      for (const fileDef of config.files) {
        const path = interpolate(fileDef.path, interpContext);
        const content = fileDef.content ? interpolate(fileDef.content, interpContext) : '';
        const type = fileDef.type || 'file';

        files.push({ path, content, type });
      }
    }

    // Generate deliverable files
    if (config.deliverableTemplate) {
      for (const deliverable of phase.deliverables) {
        const deliverableContext = {
          ...interpContext,
          deliverable: {
            id: deliverable.id,
            title: deliverable.title,
            description: deliverable.description,
            acceptanceCriteria: deliverable.acceptanceCriteria,
          },
        };

        const path = interpolate(config.deliverableTemplate.pathPattern, deliverableContext);

        // Handle acceptance criteria in content
        let content = config.deliverableTemplate.content;

        // Replace {{ deliverable.acceptanceCriteria | join('...') }} pattern
        content = content.replace(
          /\{\{\s*deliverable\.acceptanceCriteria\s*\|\s*join\(['"]([^'"]+)['"]\)\s*\}\}/g,
          (_, separator) => deliverable.acceptanceCriteria.join(separator)
        );

        // Handle {{#each}} blocks for acceptance criteria
        content = content.replace(
          /\{\{\s*#each\s+deliverable\.acceptanceCriteria\s*\}\}([\s\S]*?)\{\{\s*\/each\s*\}\}/g,
          (_, inner) => {
            return deliverable.acceptanceCriteria
              .map(criterion => inner.replace(/\{\{\s*this\s*\}\}/g, criterion))
              .join('');
          }
        );

        content = interpolate(content, deliverableContext);

        files.push({ path, content, type: 'file' });
      }
    }

    return files;
  };
}

/**
 * Load a template from a directory containing template.yaml
 */
export function loadTemplateFromDir(dirPath: string): ExtendedTemplateDefinition | null {
  const yamlPath = join(dirPath, 'template.yaml');

  if (!existsSync(yamlPath)) {
    return null;
  }

  try {
    const content = readFileSync(yamlPath, 'utf-8');
    const config = parseYaml(content) as CustomTemplateYaml;

    if (!config.name || !config.displayName || !config.fileExtension) {
      console.warn(`Invalid template.yaml in ${dirPath}: missing required fields`);
      return null;
    }

    const template: ExtendedTemplateDefinition = {
      name: config.name,
      displayName: config.displayName,
      description: config.description || '',
      fileExtension: config.fileExtension,
      generateFiles: createGeneratorFromYaml(config),
    };

    // Add hooks if defined
    if (config.hooks?.postScaffold) {
      template.defaultHooks = config.hooks.postScaffold;
    }

    return template;
  } catch (error) {
    console.warn(`Failed to load template from ${dirPath}:`, error);
    return null;
  }
}

/**
 * Scan a directory for custom templates
 */
function scanTemplatesDir(dir: string): Map<string, ExtendedTemplateDefinition> {
  const templates = new Map<string, ExtendedTemplateDefinition>();

  if (!existsSync(dir)) {
    return templates;
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const templatePath = join(dir, entry.name);
        const template = loadTemplateFromDir(templatePath);

        if (template) {
          templates.set(template.name, template);
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to scan templates directory ${dir}:`, error);
  }

  return templates;
}

/**
 * Discover all custom templates from user and project directories
 *
 * Project templates override user templates with the same name.
 */
export function discoverCustomTemplates(): Map<string, ExtendedTemplateDefinition> {
  const templates = new Map<string, ExtendedTemplateDefinition>();

  // Scan user templates first
  const userDir = getUserTemplatesDir();
  const userTemplates = scanTemplatesDir(userDir);
  for (const [name, template] of userTemplates) {
    templates.set(name, template);
  }

  // Scan project templates (override user templates)
  const projectDir = getProjectTemplatesDir();
  const projectTemplates = scanTemplatesDir(projectDir);
  for (const [name, template] of projectTemplates) {
    templates.set(name, template);
  }

  return templates;
}

/**
 * Check if any custom templates exist
 */
export function hasCustomTemplates(): boolean {
  const userDir = getUserTemplatesDir();
  const projectDir = getProjectTemplatesDir();

  if (existsSync(userDir)) {
    const entries = readdirSync(userDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && existsSync(join(userDir, entry.name, 'template.yaml'))) {
        return true;
      }
    }
  }

  if (existsSync(projectDir)) {
    const entries = readdirSync(projectDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && existsSync(join(projectDir, entry.name, 'template.yaml'))) {
        return true;
      }
    }
  }

  return false;
}
