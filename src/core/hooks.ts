/**
 * GROOT Post-Scaffold Hooks
 *
 * Executes commands after scaffolding completes (e.g., npm install, pip install).
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { HookDefinition } from '../types';

/**
 * Result of executing a single hook
 */
export interface HookResult {
  hook: HookDefinition;
  success: boolean;
  skipped: boolean;
  output?: string;
  error?: string;
}

/**
 * Options for hook execution
 */
export interface HookExecutionOptions {
  verbose?: boolean;
  dryRun?: boolean;
}

/**
 * Check if a hook should run based on its condition
 */
function shouldRunHook(hook: HookDefinition, outputDir: string): boolean {
  if (!hook.runIf || hook.runIf === 'always') {
    return true;
  }

  if (hook.runIf.startsWith('file-exists:')) {
    const filename = hook.runIf.replace('file-exists:', '');
    return existsSync(join(outputDir, filename));
  }

  // Unknown condition - default to running
  return true;
}

/**
 * Execute a single hook
 */
async function executeHook(
  hook: HookDefinition,
  outputDir: string,
  verbose: boolean
): Promise<HookResult> {
  const cwd = hook.cwd ? join(outputDir, hook.cwd) : outputDir;

  return new Promise((resolve) => {
    if (verbose) {
      console.log(chalk.gray(`  Running: ${hook.command} ${(hook.args || []).join(' ')}`));
    }

    const proc = spawn(hook.command, hook.args || [], {
      cwd,
      shell: true,
      stdio: verbose ? 'inherit' : 'pipe',
    });

    let stdout = '';
    let stderr = '';

    if (!verbose && proc.stdout) {
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (!verbose && proc.stderr) {
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    proc.on('close', (code) => {
      resolve({
        hook,
        success: code === 0,
        skipped: false,
        output: stdout || undefined,
        error: code !== 0 ? stderr || `Exit code: ${code}` : undefined,
      });
    });

    proc.on('error', (err) => {
      resolve({
        hook,
        success: false,
        skipped: false,
        error: err.message,
      });
    });
  });
}

/**
 * Execute a list of hooks sequentially
 */
export async function executeHooks(
  hooks: HookDefinition[],
  outputDir: string,
  options: HookExecutionOptions = {}
): Promise<HookResult[]> {
  const results: HookResult[] = [];
  const { verbose = false, dryRun = false } = options;

  for (const hook of hooks) {
    // Check if hook should run
    if (!shouldRunHook(hook, outputDir)) {
      if (verbose) {
        console.log(chalk.gray(`  Skipping "${hook.name}" (condition not met)`));
      }
      results.push({
        hook,
        success: true,
        skipped: true,
      });
      continue;
    }

    // Dry run mode - just show what would run
    if (dryRun) {
      console.log(chalk.cyan(`  [DRY RUN] Would run: ${hook.command} ${(hook.args || []).join(' ')}`));
      results.push({
        hook,
        success: true,
        skipped: false,
      });
      continue;
    }

    // Execute the hook
    const result = await executeHook(hook, outputDir, verbose);
    results.push(result);

    // Stop on error unless continueOnError is set
    if (!result.success && !hook.continueOnError) {
      break;
    }
  }

  return results;
}

/**
 * Display hook results
 */
export function displayHookResults(results: HookResult[]): void {
  for (const result of results) {
    if (result.skipped) {
      console.log(chalk.gray(`  ⊘ ${result.hook.name} (skipped)`));
    } else if (result.success) {
      console.log(chalk.green(`  ✓ ${result.hook.name}`));
    } else {
      console.log(chalk.red(`  ✗ ${result.hook.name}`));
      if (result.error) {
        console.log(chalk.red(`    ${result.error}`));
      }
    }
  }
}

/**
 * Default hooks for built-in templates
 */
export const DEFAULT_TEMPLATE_HOOKS: Record<string, HookDefinition[]> = {
  typescript: [
    {
      name: 'npm-install',
      command: 'npm',
      args: ['install'],
      runIf: 'file-exists:package.json',
      continueOnError: false,
    },
  ],
  javascript: [
    {
      name: 'npm-install',
      command: 'npm',
      args: ['install'],
      runIf: 'file-exists:package.json',
      continueOnError: false,
    },
  ],
  python: [
    {
      name: 'pip-install',
      command: 'pip',
      args: ['install', '-r', 'requirements.txt'],
      runIf: 'file-exists:requirements.txt',
      continueOnError: true,
    },
  ],
  react: [
    {
      name: 'npm-install',
      command: 'npm',
      args: ['install'],
      runIf: 'file-exists:package.json',
      continueOnError: false,
    },
  ],
  vue: [
    {
      name: 'npm-install',
      command: 'npm',
      args: ['install'],
      runIf: 'file-exists:package.json',
      continueOnError: false,
    },
  ],
  minimal: [],
};

/**
 * Get hooks for a template type, considering config overrides
 */
export function getHooksForTemplate(
  templateType: string,
  configHooks?: Record<string, { enabled: boolean; hooks?: HookDefinition[] }>
): HookDefinition[] {
  // Check if hooks are disabled in config
  const templateConfig = configHooks?.[templateType];
  if (templateConfig?.enabled === false) {
    return [];
  }

  // Use config hooks if specified, otherwise use defaults
  if (templateConfig?.hooks) {
    return templateConfig.hooks;
  }

  return DEFAULT_TEMPLATE_HOOKS[templateType] || [];
}
