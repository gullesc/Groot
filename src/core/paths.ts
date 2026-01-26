/**
 * GROOT Paths
 *
 * Centralized path configuration for GROOT's in-project storage.
 * All GROOT data is stored in .groot/ within the current working directory.
 *
 * Structure:
 *   .groot/
 *   ├── curriculum.json    # The active curriculum
 *   ├── sessions/          # Learning session records
 *   │   └── YYYY-MM-DD-phase-N.json
 *   └── journal/           # Learning journal entries
 *       └── YYYY-MM-DD-slug.md
 */

import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';

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
