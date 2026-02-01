/**
 * Template Registry
 *
 * Manages project scaffolding templates, including built-in templates
 * and custom templates discovered from user/project directories.
 */

import { TemplateDefinition, ExtendedTemplateDefinition } from '../types';
import { typescriptTemplate } from './typescript';
import { javascriptTemplate } from './javascript';
import { pythonTemplate } from './python';
import { minimalTemplate } from './minimal';
import { reactTemplate } from './react';
import { vueTemplate } from './vue';
import { discoverCustomTemplates } from '../core/plugin-discovery';

// Built-in templates
const builtinTemplates: Map<string, TemplateDefinition> = new Map([
  ['typescript', typescriptTemplate],
  ['javascript', javascriptTemplate],
  ['python', pythonTemplate],
  ['minimal', minimalTemplate],
  ['react', reactTemplate],
  ['vue', vueTemplate],
]);

// Combined templates cache (built-in + custom)
let allTemplates: Map<string, TemplateDefinition | ExtendedTemplateDefinition> | null = null;

/**
 * Initialize templates by combining built-in and custom templates
 */
function initTemplates(): Map<string, TemplateDefinition | ExtendedTemplateDefinition> {
  if (allTemplates) {
    return allTemplates;
  }

  allTemplates = new Map(builtinTemplates);

  // Discover and merge custom templates
  // Custom templates override built-in templates with the same name
  try {
    const customTemplates = discoverCustomTemplates();
    for (const [name, template] of customTemplates) {
      allTemplates.set(name, template);
    }
  } catch (error) {
    // Custom template discovery failed - continue with built-in only
    console.warn('Failed to discover custom templates:', error);
  }

  return allTemplates;
}

/**
 * Reset the template cache (useful for testing or after adding custom templates)
 */
export function resetTemplateCache(): void {
  allTemplates = null;
}

/**
 * Get a template definition by type/name
 */
export function getTemplateDefinition(type: string): TemplateDefinition | ExtendedTemplateDefinition | undefined {
  return initTemplates().get(type);
}

/**
 * Get all available template names
 */
export function getAvailableTemplates(): string[] {
  return Array.from(initTemplates().keys());
}

/**
 * Get all template definitions
 */
export function getAllTemplateDefinitions(): (TemplateDefinition | ExtendedTemplateDefinition)[] {
  return Array.from(initTemplates().values());
}

/**
 * Check if a template is a built-in template
 */
export function isBuiltinTemplate(name: string): boolean {
  return builtinTemplates.has(name);
}

/**
 * Get only built-in templates
 */
export function getBuiltinTemplates(): string[] {
  return Array.from(builtinTemplates.keys());
}

/**
 * Get only custom templates (non-built-in)
 */
export function getCustomTemplates(): string[] {
  const all = initTemplates();
  return Array.from(all.keys()).filter(name => !builtinTemplates.has(name));
}
