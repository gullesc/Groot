/**
 * Q&A History Manager
 *
 * Stores and retrieves Q&A interactions from groot ask commands.
 * Data is persisted to .groot/qa-history.json for presentations and lessons learned.
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  QAHistory,
  QAHistoryEntry,
  QAContext,
  Curriculum,
  Session,
} from '../types';
import { getQAHistoryPath, ensureGrootDir } from './paths';

const SCHEMA_VERSION = '1.0.0';

/**
 * Load the Q&A history from file
 * Returns empty history if file doesn't exist
 */
export async function loadQAHistory(): Promise<QAHistory> {
  const filePath = getQAHistoryPath();

  if (!existsSync(filePath)) {
    return {
      version: SCHEMA_VERSION,
      entries: [],
      lastUpdated: new Date(),
    };
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Restore Date objects
    return {
      ...data,
      lastUpdated: new Date(data.lastUpdated),
      entries: data.entries.map((entry: QAHistoryEntry) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      })),
    };
  } catch {
    // If file is corrupted, return empty history
    return {
      version: SCHEMA_VERSION,
      entries: [],
      lastUpdated: new Date(),
    };
  }
}

/**
 * Save the Q&A history to file
 */
export async function saveQAHistory(history: QAHistory): Promise<void> {
  await ensureGrootDir();
  const filePath = getQAHistoryPath();
  history.lastUpdated = new Date();
  const serialized = JSON.stringify(history, null, 2);
  await writeFile(filePath, serialized, 'utf-8');
}

/**
 * Build context from current curriculum and session
 */
export function buildQAContext(
  curriculum: Curriculum | null,
  session: Session | null
): QAContext {
  const context: QAContext = {};

  if (curriculum) {
    context.curriculumId = curriculum.id;
    context.curriculumTitle = curriculum.title;
    context.growthStage = curriculum.growthStage;

    // Get current phase from session or curriculum
    const phaseNumber = session?.phaseNumber ?? curriculum.currentPhaseIndex + 1;
    const phase = curriculum.phases.find(p => p.number === phaseNumber);

    if (phase) {
      context.phaseNumber = phase.number;
      context.phaseTitle = phase.title;
    }
  }

  return context;
}

/**
 * Add a new Q&A entry to history
 */
export async function addQAEntry(
  question: string,
  answer: string,
  context: QAContext,
  sessionId?: string
): Promise<QAHistoryEntry> {
  const history = await loadQAHistory();

  const entry: QAHistoryEntry = {
    id: uuidv4(),
    question,
    answer,
    timestamp: new Date(),
    context,
    sessionId,
  };

  history.entries.push(entry);
  await saveQAHistory(history);

  return entry;
}

/**
 * Get all Q&A entries, optionally filtered
 */
export async function getQAEntries(filters?: {
  curriculumId?: string;
  phaseNumber?: number;
  sessionId?: string;
  since?: Date;
}): Promise<QAHistoryEntry[]> {
  const history = await loadQAHistory();
  let entries = history.entries;

  if (filters) {
    if (filters.curriculumId) {
      entries = entries.filter(e => e.context.curriculumId === filters.curriculumId);
    }
    if (filters.phaseNumber) {
      entries = entries.filter(e => e.context.phaseNumber === filters.phaseNumber);
    }
    if (filters.sessionId) {
      entries = entries.filter(e => e.sessionId === filters.sessionId);
    }
    if (filters.since) {
      entries = entries.filter(e => new Date(e.timestamp) >= filters.since!);
    }
  }

  return entries;
}

/**
 * Get Q&A history statistics
 */
export async function getQAStats(): Promise<{
  totalQuestions: number;
  questionsByPhase: Record<number, number>;
}> {
  const history = await loadQAHistory();

  const questionsByPhase: Record<number, number> = {};

  for (const entry of history.entries) {
    if (entry.context.phaseNumber) {
      questionsByPhase[entry.context.phaseNumber] =
        (questionsByPhase[entry.context.phaseNumber] || 0) + 1;
    }
  }

  return {
    totalQuestions: history.entries.length,
    questionsByPhase,
  };
}
