/**
 * TypeScript Project Template
 *
 * Generates TypeScript/Node.js project structure with ESM modules.
 */

import { TemplateDefinition, ScaffoldContext, ScaffoldFile, Deliverable } from '../types';
import { generateFileName, toPascalCase, generateTodoComments } from '../core/scaffold';

export const typescriptTemplate: TemplateDefinition = {
  name: 'typescript',
  displayName: 'TypeScript',
  description: 'TypeScript project with tsconfig and ESM modules',
  fileExtension: '.ts',

  generateFiles(context: ScaffoldContext): ScaffoldFile[] {
    const { phase } = context;
    const files: ScaffoldFile[] = [];

    // Create src directory
    files.push({ path: 'src', type: 'directory', content: '' });

    // Create tsconfig.json
    files.push({
      path: 'tsconfig.json',
      type: 'file',
      content: generateTsConfig(),
    });

    // Create package.json
    files.push({
      path: 'package.json',
      type: 'file',
      content: generatePackageJson(context),
    });

    // Generate file for each deliverable
    for (const deliverable of phase.deliverables) {
      files.push(generateDeliverableFile(deliverable));
    }

    // Create index.ts that exports all deliverables
    files.push({
      path: 'src/index.ts',
      type: 'file',
      content: generateIndexFile(phase.deliverables),
    });

    return files;
  },
};

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      outDir: './dist',
      rootDir: './src',
      declaration: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  }, null, 2);
}

function generatePackageJson(context: ScaffoldContext): string {
  const { curriculum, phase } = context;
  const name = curriculum.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return JSON.stringify({
    name: `${name}-phase-${phase.number}`,
    version: '0.1.0',
    description: phase.description,
    type: 'module',
    main: './dist/index.js',
    scripts: {
      build: 'tsc',
      start: 'node dist/index.js',
      dev: 'tsc --watch',
    },
    keywords: curriculum.metadata.tags,
    license: 'MIT',
  }, null, 2);
}

function generateDeliverableFile(deliverable: Deliverable): ScaffoldFile {
  const fileName = generateFileName(deliverable.title, '.ts');
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
   */
  execute(): void {
    // TODO: Implement the main functionality
    throw new Error('Not implemented');
  }
}

/**
 * Factory function for creating ${className} instances
 */
export function create${className}(): ${className} {
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
