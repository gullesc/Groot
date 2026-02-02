/**
 * Test Runner
 *
 * Runs tests and parses results to track deliverable completion.
 * Supports Jest (TypeScript/JavaScript) and Pytest (Python).
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { Deliverable, Phase } from '../types';

export interface TestResult {
  deliverableTitle: string;
  deliverableId?: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passed: boolean;
  failedTestNames: string[];
  duration?: number;
}

export interface PhaseTestResults {
  phase: number;
  projectType: 'typescript' | 'python' | 'unknown';
  testCommand: string;
  totalDeliverables: number;
  completedDeliverables: number;
  results: TestResult[];
  rawOutput: string;
  success: boolean;
  error?: string;
}

/**
 * Detect project type based on files present
 */
export function detectProjectType(dir: string): 'typescript' | 'python' | 'unknown' {
  if (existsSync(join(dir, 'package.json'))) {
    return 'typescript';
  }
  if (existsSync(join(dir, 'pytest.ini')) || existsSync(join(dir, 'requirements.txt'))) {
    return 'python';
  }
  return 'unknown';
}

/**
 * Run tests for a phase and parse results
 */
export async function runPhaseTests(
  phase: Phase,
  outputDir: string = './',
  options: { verbose?: boolean } = {}
): Promise<PhaseTestResults> {
  const projectType = detectProjectType(outputDir);

  const result: PhaseTestResults = {
    phase: phase.number,
    projectType,
    testCommand: '',
    totalDeliverables: phase.deliverables.length,
    completedDeliverables: 0,
    results: [],
    rawOutput: '',
    success: false,
  };

  if (projectType === 'unknown') {
    result.error = 'Could not detect project type. Make sure package.json or pytest.ini exists.';
    return result;
  }

  // Run tests based on project type
  if (projectType === 'typescript') {
    return runJestTests(phase, outputDir, result, options);
  } else {
    return runPytestTests(phase, outputDir, result, options);
  }
}

/**
 * Run Jest tests and parse results
 */
async function runJestTests(
  phase: Phase,
  outputDir: string,
  result: PhaseTestResults,
  _options: { verbose?: boolean }
): Promise<PhaseTestResults> {
  result.testCommand = 'npm test -- --json';

  try {
    const output = await runCommand('npm', ['test', '--', '--json', '--testLocationInResults'], {
      cwd: outputDir,
      timeout: 120000, // 2 minute timeout
    });

    result.rawOutput = output;

    // Parse Jest JSON output
    const jsonMatch = output.match(/\{[\s\S]*"numTotalTests"[\s\S]*\}/);
    if (jsonMatch) {
      const jestResult = JSON.parse(jsonMatch[0]);
      result.results = parseJestResults(jestResult, phase.deliverables);
    } else {
      // Fallback: parse text output
      result.results = parseJestTextOutput(output, phase.deliverables);
    }

    result.completedDeliverables = result.results.filter(r => r.passed).length;
    result.success = result.completedDeliverables === result.totalDeliverables;

  } catch (error) {
    // Jest exits with code 1 when tests fail - that's expected
    const output = (error as { stdout?: string; stderr?: string }).stdout ||
                   (error as { stderr?: string }).stderr ||
                   String(error);
    result.rawOutput = output;

    // Try to parse even on failure
    const jsonMatch = output.match(/\{[\s\S]*"numTotalTests"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const jestResult = JSON.parse(jsonMatch[0]);
        result.results = parseJestResults(jestResult, phase.deliverables);
      } catch {
        result.results = parseJestTextOutput(output, phase.deliverables);
      }
    } else {
      result.results = parseJestTextOutput(output, phase.deliverables);
    }

    result.completedDeliverables = result.results.filter(r => r.passed).length;
    result.success = result.completedDeliverables === result.totalDeliverables;
  }

  return result;
}

/**
 * Run Pytest tests and parse results
 */
async function runPytestTests(
  phase: Phase,
  outputDir: string,
  result: PhaseTestResults,
  _options: { verbose?: boolean }
): Promise<PhaseTestResults> {
  result.testCommand = 'python3 -m pytest -v';

  try {
    // Use python3 -m pytest for better macOS/venv compatibility
    const output = await runCommand('python3', ['-m', 'pytest', '-v', '--tb=short'], {
      cwd: outputDir,
      timeout: 120000,
    });

    result.rawOutput = output;
    result.results = parsePytestOutput(output, phase.deliverables);
    result.completedDeliverables = result.results.filter(r => r.passed).length;
    result.success = result.completedDeliverables === result.totalDeliverables;

  } catch (error) {
    // Pytest exits with code 1 when tests fail
    const output = (error as { stdout?: string; stderr?: string }).stdout ||
                   (error as { stderr?: string }).stderr ||
                   String(error);
    result.rawOutput = output;
    result.results = parsePytestOutput(output, phase.deliverables);
    result.completedDeliverables = result.results.filter(r => r.passed).length;
    result.success = result.completedDeliverables === result.totalDeliverables;
  }

  return result;
}

/**
 * Parse Jest JSON output into deliverable results
 */
function parseJestResults(jestResult: JestJsonResult, deliverables: Deliverable[]): TestResult[] {
  const results: TestResult[] = [];

  for (const deliverable of deliverables) {
    // Find test file for this deliverable
    const deliverableName = toPascalCase(deliverable.title);
    const testFile = jestResult.testResults?.find(tr =>
      tr.name.toLowerCase().includes(deliverableName.toLowerCase()) ||
      tr.name.toLowerCase().includes(toKebabCase(deliverable.title))
    );

    if (testFile) {
      const passed = testFile.assertionResults?.filter(a => a.status === 'passed').length || 0;
      const failed = testFile.assertionResults?.filter(a => a.status === 'failed').length || 0;
      const skipped = testFile.assertionResults?.filter(a => a.status === 'pending' || a.status === 'skipped').length || 0;
      const failedNames = testFile.assertionResults
        ?.filter(a => a.status === 'failed')
        .map(a => a.title) || [];

      const totalTests = passed + failed + skipped;

      results.push({
        deliverableTitle: deliverable.title,
        deliverableId: deliverable.id,
        totalTests,
        passedTests: passed,
        failedTests: failed,
        skippedTests: skipped,
        // Passed = has passing tests AND no failures AND no skipped tests
        // (skipped tests mean acceptance criteria haven't been implemented yet)
        passed: passed > 0 && failed === 0 && skipped === 0,
        failedTestNames: failedNames,
      });
    } else {
      // No test file found for this deliverable
      results.push({
        deliverableTitle: deliverable.title,
        deliverableId: deliverable.id,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        passed: false,
        failedTestNames: ['No test file found'],
      });
    }
  }

  return results;
}

/**
 * Parse Jest text output (fallback)
 */
function parseJestTextOutput(output: string, deliverables: Deliverable[]): TestResult[] {
  const results: TestResult[] = [];

  for (const deliverable of deliverables) {
    const deliverableName = toPascalCase(deliverable.title);

    // Look for test suite results in output
    const suiteRegex = new RegExp(`(PASS|FAIL).*${deliverableName}`, 'i');
    const match = output.match(suiteRegex);

    // Count individual test results
    const passRegex = new RegExp(`✓.*${deliverableName}|${deliverableName}.*✓`, 'gi');
    const failRegex = new RegExp(`✕.*${deliverableName}|${deliverableName}.*✕`, 'gi');

    const passMatches = output.match(passRegex) || [];
    const failMatches = output.match(failRegex) || [];

    results.push({
      deliverableTitle: deliverable.title,
      deliverableId: deliverable.id,
      totalTests: passMatches.length + failMatches.length,
      passedTests: passMatches.length,
      failedTests: failMatches.length,
      skippedTests: 0,
      passed: match ? match[1] === 'PASS' : failMatches.length === 0 && passMatches.length > 0,
      failedTestNames: [],
    });
  }

  return results;
}

/**
 * Parse Pytest output into deliverable results
 */
function parsePytestOutput(output: string, deliverables: Deliverable[]): TestResult[] {
  const results: TestResult[] = [];

  for (const deliverable of deliverables) {
    const moduleName = toSnakeCase(deliverable.title);
    const className = toPascalCase(deliverable.title);

    // Count passed/failed/skipped tests for this deliverable
    const passRegex = new RegExp(`test_${moduleName}.*PASSED|Test${className}.*PASSED`, 'gi');
    const failRegex = new RegExp(`test_${moduleName}.*FAILED|Test${className}.*FAILED`, 'gi');
    const skipRegex = new RegExp(`test_${moduleName}.*SKIPPED|Test${className}.*SKIPPED`, 'gi');

    const passMatches = output.match(passRegex) || [];
    const failMatches = output.match(failRegex) || [];
    const skipMatches = output.match(skipRegex) || [];

    // Extract failed test names
    const failedNames: string[] = [];
    const failedDetailRegex = new RegExp(`(test_\\w+).*FAILED`, 'gi');
    let match;
    while ((match = failedDetailRegex.exec(output)) !== null) {
      if (match[0].toLowerCase().includes(moduleName.toLowerCase()) && match[1]) {
        failedNames.push(match[1]);
      }
    }

    const totalTests = passMatches.length + failMatches.length + skipMatches.length;

    results.push({
      deliverableTitle: deliverable.title,
      deliverableId: deliverable.id,
      totalTests,
      passedTests: passMatches.length,
      failedTests: failMatches.length,
      skippedTests: skipMatches.length,
      // Passed = has passing tests AND no failures AND no skipped tests
      // (skipped tests mean acceptance criteria haven't been implemented yet)
      passed: passMatches.length > 0 && failMatches.length === 0 && skipMatches.length === 0,
      failedTestNames: failedNames,
    });
  }

  return results;
}

/**
 * Run a command and capture output
 */
function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; timeout?: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error('Command timed out'));
    }, options.timeout || 60000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stdout + stderr);
      } else {
        const error = new Error(`Command failed with code ${code}`) as Error & { stdout: string; stderr: string };
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });

    proc.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
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

// Type definitions for Jest JSON output
interface JestJsonResult {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  testResults?: Array<{
    name: string;
    assertionResults?: Array<{
      title: string;
      status: 'passed' | 'failed' | 'pending' | 'skipped';
    }>;
  }>;
}
