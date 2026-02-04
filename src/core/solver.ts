/**
 * Solver Module
 *
 * Generates working implementations for deliverables when students get stuck.
 * Acts as an "answer key" that can generate both source code and tests.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { Deliverable, Phase } from '../types';
import { loadConfig } from './config';
import { detectProjectType } from './test-runner';

export interface SolveOptions {
  outputDir: string;
  testsOnly?: boolean;
  sourceOnly?: boolean;  // TDD mode: only generate source, tests already exist
  dryRun?: boolean;
  verbose?: boolean;
}

export interface SolveResult {
  deliverableTitle: string;
  deliverableId?: string;
  sourceFile?: string;
  testFile?: string;
  sourceGenerated: boolean;
  testsGenerated: boolean;
  error?: string;
}

export interface PhaseSolveResults {
  phase: number;
  results: SolveResult[];
  success: boolean;
  error?: string;
}

/**
 * Generate solution for a single deliverable
 */
export async function solveDeliverable(
  deliverable: Deliverable,
  phase: Phase,
  options: SolveOptions
): Promise<SolveResult> {
  const config = loadConfig();
  const projectType = detectProjectType(options.outputDir);

  const result: SolveResult = {
    deliverableTitle: deliverable.title,
    deliverableId: deliverable.id,
    sourceGenerated: false,
    testsGenerated: false,
  };

  if (projectType === 'unknown') {
    result.error = 'Could not detect project type';
    return result;
  }

  try {
    const client = new Anthropic({ apiKey: config.anthropicApiKey });

    // Determine file paths based on project type
    const { sourcePath, testPath, language } = getFilePaths(deliverable.title, projectType, options.outputDir);
    result.sourceFile = sourcePath;
    result.testFile = testPath;

    // Read existing stub code if it exists
    let existingSource = '';
    let existingTest = '';

    if (existsSync(sourcePath)) {
      existingSource = await readFile(sourcePath, 'utf-8');
    }
    if (existsSync(testPath)) {
      existingTest = await readFile(testPath, 'utf-8');
    }

    // Generate source implementation (unless tests-only)
    if (!options.testsOnly) {
      const sourceCode = await generateSourceCode(
        client,
        deliverable,
        phase,
        existingSource,
        language
      );

      if (!options.dryRun) {
        await writeFile(sourcePath, sourceCode, 'utf-8');
      }
      result.sourceGenerated = true;

      if (options.verbose) {
        console.log(`Generated source: ${sourcePath}`);
      }
    }

    // Generate test implementations (unless source-only mode for TDD)
    if (!options.sourceOnly) {
      const testCode = await generateTestCode(
        client,
        deliverable,
        existingTest,
        language
      );

      if (!options.dryRun) {
        await writeFile(testPath, testCode, 'utf-8');
      }
      result.testsGenerated = true;

      if (options.verbose) {
        console.log(`Generated tests: ${testPath}`);
      }
    } else if (options.verbose) {
      console.log(`Skipping test generation (TDD mode): ${testPath}`);
    }

  } catch (error) {
    result.error = String(error);
  }

  return result;
}

/**
 * Generate solutions for all deliverables in a phase
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

  // Regenerate __init__.py for Python projects so it stays in sync
  // with the actual class names in the generated source files
  const projectType = detectProjectType(options.outputDir);
  if (projectType === 'python' && !options.dryRun) {
    await regenerateInitFile(phase.deliverables, options.outputDir);
  }

  return {
    phase: phase.number,
    results,
    success: results.every(r => !r.error),
  };
}

/**
 * Get file paths for a deliverable based on project type
 */
function getFilePaths(
  title: string,
  projectType: 'typescript' | 'python',
  outputDir: string
): { sourcePath: string; testPath: string; language: string } {
  if (projectType === 'typescript') {
    const fileName = toKebabCase(title);
    return {
      sourcePath: join(outputDir, 'src', `${fileName}.ts`),
      testPath: join(outputDir, 'tests', `${fileName}.test.ts`),
      language: 'typescript',
    };
  } else {
    const fileName = toSnakeCase(title);
    return {
      sourcePath: join(outputDir, 'src', `${fileName}.py`),
      testPath: join(outputDir, 'tests', `test_${fileName}.py`),
      language: 'python',
    };
  }
}

/**
 * Regenerate src/__init__.py for Python projects to keep it in sync
 * with the actual class/module names after solving.
 */
async function regenerateInitFile(
  deliverables: Deliverable[],
  outputDir: string
): Promise<void> {
  const initPath = join(outputDir, 'src', '__init__.py');
  if (!existsSync(initPath)) return;

  const imports: string[] = [];
  const exportNames: string[] = [];

  for (const d of deliverables) {
    const moduleName = toSnakeCase(d.title);
    const sourcePath = join(outputDir, 'src', `${moduleName}.py`);

    // Read the actual class name from the generated source file
    // rather than computing it (Claude may use different casing)
    let className = toPascalCase(d.title); // fallback only
    if (existsSync(sourcePath)) {
      try {
        const source = await readFile(sourcePath, 'utf-8');
        const classMatch = source.match(/^class\s+([A-Za-z_][A-Za-z0-9_]*)/m);
        if (classMatch && classMatch[1]) {
          className = classMatch[1];
        }
      } catch {
        // Use fallback
      }
    }

    imports.push(`from .${moduleName} import ${className}`);
    exportNames.push(`"${className}"`);
  }

  // Use try/except per import so one broken module doesn't block all tests
  const tryImports = imports.map((imp, i) => {
    const name = (exportNames[i] ?? '""').replace(/"/g, '');
    return `try:\n    ${imp}\nexcept (ImportError, SyntaxError):\n    ${name} = None  # type: ignore`;
  });

  const content = `"""
Phase deliverables package.

This module exports all deliverable implementations.
"""

${tryImports.join('\n\n')}

__all__ = [${exportNames.join(', ')}]
`;

  await writeFile(initPath, content, 'utf-8');
}

/**
 * Generate source code implementation using Claude
 */
async function generateSourceCode(
  client: Anthropic,
  deliverable: Deliverable,
  phase: Phase,
  existingCode: string,
  language: string
): Promise<string> {
  const prompt = `You are implementing a deliverable for a learning curriculum.

DELIVERABLE: ${deliverable.title}
DESCRIPTION: ${deliverable.description}

ACCEPTANCE CRITERIA:
${deliverable.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

PHASE CONTEXT: ${phase.title} - ${phase.description}

EXISTING STUB CODE:
\`\`\`${language}
${existingCode}
\`\`\`

Generate a COMPLETE, WORKING implementation that satisfies ALL acceptance criteria.

CRITICAL REQUIREMENTS:
1. PRESERVE the EXACT class name and factory function from the stub - do NOT rename them
2. Do NOT add external dependencies (no pip install, no npm install needed)
3. Use ONLY the standard library for ${language}
4. Keep the code SIMPLE - this is educational, not production code
5. The execute() method should work without throwing NotImplementedError
6. Implement all TODO items from the stub
7. Include helpful comments explaining the implementation
8. The file MUST end with the factory function - do NOT omit it
9. NEVER nest triple-quoted strings (''' inside ''' or \""" inside \"""). If you need to embed code as a string, use double-quotes for the outer string and single-quotes inside (or vice versa), or use string concatenation. Nested triple quotes cause SyntaxErrors.

The tests expect these EXACT exports:
- The class name from the stub (e.g., DatabaseAwareNlpPipeline)
- The factory function from the stub (e.g., create_database_aware_nlp_pipeline)

IMPORTANT: You MUST include the factory function at the end of the file. The factory function
is a simple function that creates and returns an instance of the class. If the stub has
\`def create_${language === 'python' ? toSnakeCase(deliverable.title) : ''}(...)\`, you MUST include it.
Without it, tests will fail to import.

Return ONLY the complete source code file with the same structure as the stub.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16384,
    messages: [{ role: 'user', content: prompt }],
  });

  // Extract code from response
  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return extractCode(content.text, language);
}

/**
 * Generate test implementations using Claude
 */
async function generateTestCode(
  client: Anthropic,
  deliverable: Deliverable,
  existingTest: string,
  language: string
): Promise<string> {
  const prompt = `You are implementing tests for a learning curriculum deliverable.

DELIVERABLE: ${deliverable.title}
DESCRIPTION: ${deliverable.description}

ACCEPTANCE CRITERIA:
${deliverable.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

EXISTING TEST STUB:
\`\`\`${language}
${existingTest}
\`\`\`

Generate COMPLETE, WORKING test implementations that verify ALL acceptance criteria.

Requirements:
- Keep the same test structure (class names, imports, fixtures)
- Replace all \`assert False, "Test not implemented"\` with real assertions
- Replace all \`expect(true).toBe(false)\` with real assertions
- Each test should verify one specific acceptance criterion
- Add helpful comments explaining what each test verifies
- Tests should be educational - someone learning should understand them
- Make tests that will PASS when the implementation is correct
${language === 'python' ? `
CRITICAL - Python import format:
- Source modules live in the src/ package directory
- All imports MUST use the "src." prefix: \`from src.module_name import ClassName\`
- Example: \`from src.${toSnakeCase(deliverable.title)} import ${toPascalCase(deliverable.title)}\`
- Do NOT import without the src. prefix (e.g., \`from ${toSnakeCase(deliverable.title)} import ...\` will FAIL)
- Do NOT redefine classes that exist in the source module — import them instead
` : ''}
Return ONLY the complete test file, no explanations outside the code.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16384,
    messages: [{ role: 'user', content: prompt }],
  });

  // Extract code from response
  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return extractCode(content.text, language);
}

/**
 * Extract code from Claude's response (handles markdown code blocks)
 */
function extractCode(text: string, _language: string): string {
  // Try multiple patterns to extract code from markdown

  // Pattern 1: ```language\ncode\n```
  const codeBlockMatch = text.match(/```(?:python|typescript|javascript|ts|py|js)?\s*\n([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  // Pattern 2: ```\ncode\n``` (no language specified)
  const simpleBlockMatch = text.match(/```\s*\n([\s\S]*?)```/);
  if (simpleBlockMatch && simpleBlockMatch[1]) {
    return simpleBlockMatch[1].trim();
  }

  // Pattern 3: Strip leading/trailing ``` if present (malformed blocks)
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    // Remove opening fence (with optional language)
    cleaned = cleaned.replace(/^```(?:python|typescript|javascript|ts|py|js)?\s*\n?/, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\n?```$/, '');
  }

  return cleaned.trim();
}

// Helper functions
function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function toKebabCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-|-$/g, '');
}

function toSnakeCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toLowerCase()
    .replace(/^_|_$/g, '');
}
