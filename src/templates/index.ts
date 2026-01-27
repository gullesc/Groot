/**
 * Template Registry
 *
 * Manages project scaffolding templates.
 */

import { TemplateDefinition, TemplateType } from '../types';
import { typescriptTemplate } from './typescript';
import { javascriptTemplate } from './javascript';
import { pythonTemplate } from './python';
import { minimalTemplate } from './minimal';

const templates: Map<TemplateType, TemplateDefinition> = new Map([
  ['typescript', typescriptTemplate],
  ['javascript', javascriptTemplate],
  ['python', pythonTemplate],
  ['minimal', minimalTemplate],
]);

export function getTemplateDefinition(type: TemplateType): TemplateDefinition | undefined {
  return templates.get(type);
}

export function getAvailableTemplates(): TemplateType[] {
  return Array.from(templates.keys());
}

export function getAllTemplateDefinitions(): TemplateDefinition[] {
  return Array.from(templates.values());
}
