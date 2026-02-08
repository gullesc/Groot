/**
 * GROOT Paths
 *
 * Centralized path configuration for GROOT's in-project storage.
 * All GROOT data is stored in .groot/ within the current working directory.
 *
 * Structure:
 *   .groot/
 *   ├── curriculum.json      # The active curriculum
 *   ├── active-session.json  # Currently active learning session
 *   ├── qa-history.json      # Q&A history from groot ask
 *   ├── sessions/            # Completed session records
 *   │   └── YYYY-MM-DD-phase-N.json
 *   └── journal/             # Learning journal entries
 *       └── YYYY-MM-DD-slug.md
 */

import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

// Base directory for all GROOT data
const GROOT_DIR = '.groot';

/**
 * Get the .groot directory path
 */
export function getGrootDir(): string {
  return join(process.cwd(), GROOT_DIR);
}

/**
 * Get the curriculum file path
 */
export function getCurriculumPath(): string {
  return join(getGrootDir(), 'curriculum.json');
}

/**
 * Get the active session file path
 */
export function getActiveSessionPath(): string {
  return join(getGrootDir(), 'active-session.json');
}

/**
 * Check if there is an active session
 */
export function hasActiveSessionFile(): boolean {
  return existsSync(getActiveSessionPath());
}

/**
 * Get the sessions directory path
 */
export function getSessionsDir(): string {
  return join(getGrootDir(), 'sessions');
}

/**
 * Get the journal directory path
 */
export function getJournalDir(): string {
  return join(getGrootDir(), 'journal');
}

/**
 * Get the Q&A history file path
 */
export function getQAHistoryPath(): string {
  return join(getGrootDir(), 'qa-history.json');
}

/**
 * Check if Q&A history file exists
 */
export function hasQAHistory(): boolean {
  return existsSync(getQAHistoryPath());
}

/**
 * Check if GROOT is initialized in the current directory
 */
export function isGrootInitialized(): boolean {
  return existsSync(getGrootDir());
}

/**
 * Check if a curriculum exists
 */
export function hasCurriculum(): boolean {
  return existsSync(getCurriculumPath());
}

/**
 * Initialize the .groot directory structure
 */
export async function initGrootDir(): Promise<void> {
  const grootDir = getGrootDir();

  if (!existsSync(grootDir)) {
    await mkdir(grootDir, { recursive: true });
  }

  const sessionsDir = getSessionsDir();
  if (!existsSync(sessionsDir)) {
    await mkdir(sessionsDir, { recursive: true });
  }

  const journalDir = getJournalDir();
  if (!existsSync(journalDir)) {
    await mkdir(journalDir, { recursive: true });
  }
}

/**
 * Ensure .groot directory exists (creates if needed)
 */
export async function ensureGrootDir(): Promise<void> {
  if (!isGrootInitialized()) {
    await initGrootDir();
  }
}

// ============================================================================
// Phase 6: User-level paths
// ============================================================================

/**
 * Get the user's GROOT config directory (~/.groot)
 */
export function getUserGrootDir(): string {
  return join(homedir(), '.groot');
}

/**
 * Get the user's GROOT config file path (~/.groot/config.yaml)
 */
export function getUserConfigPath(): string {
  return join(getUserGrootDir(), 'config.yaml');
}

/**
 * Check if user config file exists
 */
export function hasUserConfig(): boolean {
  return existsSync(getUserConfigPath());
}

/**
 * Get the user's custom templates directory (~/.groot/templates)
 */
export function getUserTemplatesDir(): string {
  return join(getUserGrootDir(), 'templates');
}

/**
 * Check if user templates directory exists
 */
export function hasUserTemplates(): boolean {
  return existsSync(getUserTemplatesDir());
}

/**
 * Get the project-level config file path
 * Checks for .grootrc, .grootrc.yaml, or .groot/config.yaml
 */
export function getProjectConfigPath(): string | null {
  const candidates = [
    join(process.cwd(), '.grootrc'),
    join(process.cwd(), '.grootrc.yaml'),
    join(process.cwd(), '.groot', 'config.yaml'),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Get the project's custom templates directory (./templates)
 */
export function getProjectTemplatesDir(): string {
  return join(process.cwd(), 'templates');
}

/**
 * Check if project templates directory exists
 */
export function hasProjectTemplates(): boolean {
  return existsSync(getProjectTemplatesDir());
}

/**
 * Initialize user's GROOT directory (~/.groot)
 */
export async function initUserGrootDir(): Promise<void> {
  const userDir = getUserGrootDir();

  if (!existsSync(userDir)) {
    await mkdir(userDir, { recursive: true });
  }

  const templatesDir = getUserTemplatesDir();
  if (!existsSync(templatesDir)) {
    await mkdir(templatesDir, { recursive: true });
  }
}

// ============================================================================
// Spec-Driven Development (SDD) Paths
// ============================================================================

/**
 * Get the specs directory path (project-root/specs)
 */
export function getSpecsDir(outputDir?: string): string {
  return join(outputDir || process.cwd(), 'specs');
}

/**
 * Get the phase specs directory path (project-root/specs/phase-N)
 */
export function getPhaseSpecsDir(phaseNumber: number, outputDir?: string): string {
  return join(getSpecsDir(outputDir), `phase-${phaseNumber}`);
}

/**
 * Get the deliverable spec directory path (project-root/specs/phase-N/deliverable-slug)
 */
export function getDeliverableSpecDir(
  phaseNumber: number,
  deliverableSlug: string,
  outputDir?: string
): string {
  return join(getPhaseSpecsDir(phaseNumber, outputDir), deliverableSlug);
}

/**
 * Get the constitution file path (.groot/constitution.md)
 */
export function getConstitutionPath(outputDir?: string): string {
  const grootDir = outputDir ? join(outputDir, '.groot') : getGrootDir();
  return join(grootDir, 'constitution.md');
}

/**
 * Check if constitution exists
 */
export function hasConstitution(outputDir?: string): boolean {
  return existsSync(getConstitutionPath(outputDir));
}

/**
 * Check if specs directory exists for a phase
 */
export function hasPhaseSpecs(phaseNumber: number, outputDir?: string): boolean {
  return existsSync(getPhaseSpecsDir(phaseNumber, outputDir));
}

/**
 * Convert a deliverable title to a kebab-case slug for directory naming
 */
export function toDeliverableSlug(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-|-$/g, '');
}
