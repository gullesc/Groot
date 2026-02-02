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

    // Create directories
    files.push({ path: 'src', type: 'directory', content: '' });
    files.push({ path: 'tests', type: 'directory', content: '' });

    // Create tsconfig.json
    files.push({
      path: 'tsconfig.json',
      type: 'file',
      content: generateTsConfig(),
    });

    // Create jest.config.js
    files.push({
      path: 'jest.config.js',
      type: 'file',
      content: generateJestConfig(),
    });

    // Create package.json
    files.push({
      path: 'package.json',
      type: 'file',
      content: generatePackageJson(context),
    });

    // Generate source and test files for each deliverable
    for (const deliverable of phase.deliverables) {
      files.push(generateDeliverableFile(deliverable));
      files.push(generateTestFile(deliverable));
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

function generateJestConfig(): string {
  return `/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\\\.{1,2}/.*)\\\\.js$': '$1',
  },
  transform: {
    '^.+\\\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
};
`;
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
      test: 'node --experimental-vm-modules node_modules/jest/bin/jest.js',
      'test:watch': 'node --experimental-vm-modules node_modules/jest/bin/jest.js --watch',
      'test:coverage': 'node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage',
    },
    keywords: curriculum.metadata.tags,
    license: 'MIT',
    devDependencies: {
      '@types/jest': '^29.5.0',
      'jest': '^29.7.0',
      'ts-jest': '^29.2.0',
      'typescript': '^5.0.0',
    },
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

function generateTestFile(deliverable: Deliverable): ScaffoldFile {
  const fileName = generateFileName(deliverable.title, '.test.ts');
  const sourceFileName = generateFileName(deliverable.title, '');
  const className = toPascalCase(deliverable.title);

  // Generate test cases from acceptance criteria (skipped until implemented)
  const testCases = deliverable.acceptanceCriteria.map((criterion) => {
    return `  it.skip('should ${criterion.toLowerCase()}', () => {
    // TODO: Implement test for: ${criterion}
  });`;
  }).join('\n\n');

  const content = `/**
 * Tests for ${deliverable.title}
 *
 * Run: npm test
 * Watch: npm run test:watch
 * Coverage: npm run test:coverage
 */

import { ${className}, create${className} } from '../src/${sourceFileName}.js';

describe('${className}', () => {
  let instance: ${className};

  beforeEach(() => {
    instance = create${className}();
  });

  describe('initialization', () => {
    it('should create an instance', () => {
      expect(instance).toBeInstanceOf(${className});
    });
  });

  describe('acceptance criteria', () => {
${testCases}
  });

  describe('execute()', () => {
    it('should complete without errors when implemented', () => {
      // TODO: Update this test once execute() is implemented
      expect(() => instance.execute()).toThrow('Not implemented');
    });
  });
});
`;

  return {
    path: `tests/${fileName}`,
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
