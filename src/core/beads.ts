/**
 * BEADS Integration
 * 
 * Provides integration with BEADS (git-backed issue tracker) for:
 * - Agent memory persistence
 * - Task tracking
 * - Progress monitoring
 * 
 * BEADS commands are executed via CLI, not a direct API.
 */

import { execSync } from 'child_process';
import { BeadsIssue, BeadsContext } from '../types';

/**
 * Check if BEADS is installed and available
 */
export function isBeadsAvailable(): boolean {
  try {
    execSync('bd --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if BEADS is initialized in the current directory
 */
export function isBeadsInitialized(): boolean {
  try {
    execSync('bd info', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize BEADS in the current directory
 */
export function initBeads(): void {
  execSync('bd init --quiet', { stdio: 'inherit' });
}

/**
 * Create a new BEADS issue
 */
export function createIssue(
  title: string, 
  options: {
    description?: string;
    type?: 'epic' | 'task' | 'bug' | 'feature' | 'chore';
    priority?: number;
    labels?: string[];
  } = {}
): string {
  const args = ['bd', 'create', `"${title}"`];
  
  if (options.description) {
    args.push('-d', `"${options.description}"`);
  }
  if (options.type) {
    args.push('-t', options.type);
  }
  if (options.priority !== undefined) {
    args.push('-p', options.priority.toString());
  }
  if (options.labels && options.labels.length > 0) {
    args.push('-l', options.labels.join(','));
  }
  args.push('--json');
  
  const result = execSync(args.join(' '), { encoding: 'utf-8' });
  const parsed = JSON.parse(result);
  return parsed.id;
}

/**
 * Get ready work (issues with no blockers)
 */
export function getReadyWork(): BeadsIssue[] {
  try {
    const result = execSync('bd ready --json', { encoding: 'utf-8' });
    return JSON.parse(result);
  } catch {
    return [];
  }
}

/**
 * Get all issues
 */
export function listIssues(status?: 'open' | 'in_progress' | 'closed'): BeadsIssue[] {
  try {
    const args = ['bd', 'list', '--json'];
    if (status) {
      args.push('--status', status);
    }
    const result = execSync(args.join(' '), { encoding: 'utf-8' });
    return JSON.parse(result);
  } catch {
    return [];
  }
}

/**
 * Update an issue's status
 */
export function updateIssueStatus(id: string, status: 'open' | 'in_progress' | 'closed'): void {
  if (status === 'closed') {
    execSync(`bd close ${id}`, { stdio: 'pipe' });
  } else {
    execSync(`bd update ${id} --status ${status}`, { stdio: 'pipe' });
  }
}

/**
 * Add a dependency between issues
 */
export function addDependency(
  childId: string, 
  parentId: string, 
  type: 'blocks' | 'related' | 'parent-child' | 'discovered-from' = 'blocks'
): void {
  execSync(`bd dep add ${childId} ${parentId} --type ${type}`, { stdio: 'pipe' });
}

/**
 * Get BEADS context for agents
 */
export function getBeadsContext(): BeadsContext | null {
  if (!isBeadsAvailable() || !isBeadsInitialized()) {
    return null;
  }
  
  return {
    projectPath: process.cwd(),
    currentIssues: listIssues('open'),
    readyWork: getReadyWork(),
  };
}

/**
 * Sync BEADS with git
 */
export function syncBeads(): void {
  execSync('bd sync', { stdio: 'pipe' });
}
