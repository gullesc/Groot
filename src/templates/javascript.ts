/**
 * JavaScript Project Template
 *
 * Generates JavaScript/Node.js project structure with ES modules.
 */

import { TemplateDefinition, ScaffoldContext, ScaffoldFile, Deliverable } from '../types';
import { generateFileName, toPascalCase, generateTodoComments } from '../core/scaffold';

export const javascriptTemplate: TemplateDefinition = {
  name: 'javascript',
  displayName: 'JavaScript',
  description: 'JavaScript project with ES modules and JSDoc types',
  fileExtension: '.js',

  generateFiles(context: ScaffoldContext): ScaffoldFile[] {
    const { phase } = context;
    const files: ScaffoldFile[] = [];

    // Create src directory
    files.push({ path: 'src', type: 'directory', content: '' });

    // Create package.json
    files.push({
      path: 'package.json',
      type: 'file',
      content: generatePackageJson(context),
    });

    // Create jsconfig.json for VS Code intellisense
    files.push({
      path: 'jsconfig.json',
      type: 'file',
      content: generateJsConfig(),
    });

    // Generate file for each deliverable
    for (const deliverable of phase.deliverables) {
      files.push(generateDeliverableFile(deliverable));
    }

    // Create index.js that exports all deliverables
    files.push({
      path: 'src/index.js',
      type: 'file',
      content: generateIndexFile(phase.deliverables),
    });

    return files;
  },
};

function generatePackageJson(context: ScaffoldContext): string {
  const { curriculum, phase } = context;
  const name = curriculum.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return JSON.stringify({
    name: `${name}-phase-${phase.number}`,
    version: '0.1.0',
    description: phase.description,
    type: 'module',
    main: './src/index.js',
    scripts: {
      start: 'node src/index.js',
      test: 'node --test',
    },
    keywords: curriculum.metadata.tags,
    license: 'MIT',
  }, null, 2);
}

function generateJsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      module: 'ESNext',
      moduleResolution: 'NodeNext',
      target: 'ES2022',
      checkJs: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules'],
  }, null, 2);
}

function generateDeliverableFile(deliverable: Deliverable): ScaffoldFile {
  const fileName = generateFileName(deliverable.title, '.js');
  const className = toPascalCase(deliverable.title);

  const todos = generateTodoComments(deliverable.acceptanceCriteria, '//');

  const content = `/**
 * ${deliverable.title}
 *
 * ${deliverable.description}
 */

${todos}

/**
 * ${className}
 *
 * Implement this class to complete the deliverable.
 */
export class ${className} {
  constructor() {
    // TODO: Initialize your implementation
  }

  /**
   * Main entry point
   * @returns {void}
   */
  execute() {
    // TODO: Implement the main functionality
    throw new Error('Not implemented');
  }
}

/**
 * Factory function for creating ${className} instances
 * @returns {${className}}
 */
export function create${className}() {
  return new ${className}();
}
`;

  return {
    path: `src/${fileName}`,
    type: 'file',
    content,
  };
}

function generateIndexFile(deliverables: Deliverable[]): string {
  const exports = deliverables.map(d => {
    const fileName = generateFileName(d.title, '');
    return `export * from './${fileName}.js';`;
  });

  return `/**
 * Phase Deliverables
 *
 * This file exports all deliverable implementations.
 */

${exports.join('\n')}
`;
}
