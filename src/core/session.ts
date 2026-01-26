/**
 * Session Manager
 *
 * Manages learning sessions, progress tracking, and handoffs.
 * Sessions persist learning progress across multiple work periods.
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Session,
  SessionHandoff,
  Curriculum,
  Phase,
} from '../types';
import { getSessionsDir, ensureGrootDir } from './paths';

// Re-export for backwards compatibility
export { getSessionsDir } from './paths';

// Track current active session in memory
let currentSession: Session | null = null;

/**
 * Generate a session filename
 * Format: YYYY-MM-DD-curriculum-slug-phase-N.json
 */
function generateSessionFilename(curriculum: Curriculum, phaseNumber: number): string {
  const date = new Date().toISOString().split('T')[0];
  const slug = curriculum.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  return `${date}-${slug}-phase-${phaseNumber}.json`;
}

/**
 * Start a new learning session
 */
export async function startSession(
  curriculum: Curriculum,
  phaseNumber: number
): Promise<Session> {
  await ensureGrootDir();

  const phase = curriculum.phases.find(p => p.number === phaseNumber);
  if (!phase) {
    throw new Error(`Phase ${phaseNumber} not found in curriculum`);
  }

  const session: Session = {
    id: uuidv4(),
    curriculumId: curriculum.id,
    curriculumPath: '', // Will be set by caller
    curriculumTitle: curriculum.title,
    phaseNumber,
    phaseTitle: phase.title,
    phaseId: phase.id,
    startedAt: new Date(),
    status: 'active',
    notes: [],
    questionsAsked: [],
    progress: {
      objectivesCompleted: [],
      deliverablesCompleted: [],
      timeSpentMinutes: 0,
    },
  };

  currentSession = session;
  return session;
}

/**
 * Start a session from a curriculum path
 */
export async function startSessionFromPath(
  curriculumPath: string,
  curriculum: Curriculum,
  phaseNumber: number
): Promise<Session> {
  const session = await startSession(curriculum, phaseNumber);
  session.curriculumPath = curriculumPath;
  currentSession = session;
  return session;
}

/**
 * Get the currently active session
 */
export function getCurrentSession(): Session | null {
  return currentSession;
}

/**
 * Set the current session (for resuming)
 */
export function setCurrentSession(session: Session | null): void {
  currentSession = session;
}

/**
 * Check if there's an active session
 */
export function hasActiveSession(): boolean {
  return currentSession !== null && currentSession.status === 'active';
}

/**
 * Save a session to file
 */
export async function saveSession(session: Session): Promise<string> {
  await ensureGrootDir();

  // Generate filename for new sessions or use existing path
  const filename = generateSessionFilename(
    { id: session.curriculumId, title: session.curriculumTitle } as Curriculum,
    session.phaseNumber
  );
  const filePath = join(getSessionsDir(), filename);

  // Calculate time spent if session is ending
  if (session.endedAt && session.startedAt) {
    const start = new Date(session.startedAt).getTime();
    const end = new Date(session.endedAt).getTime();
    session.progress.timeSpentMinutes = Math.round((end - start) / (1000 * 60));
  }

  // Serialize with proper date handling
  const serialized = JSON.stringify(session, null, 2);
  await writeFile(filePath, serialized, 'utf-8');

  return filePath;
}

/**
 * Load a session from file
 */
export async function loadSession(sessionPath: string): Promise<Session> {
  const content = await readFile(sessionPath, 'utf-8');
  const data = JSON.parse(content);

  // Restore Date objects
  return {
    ...data,
    startedAt: new Date(data.startedAt),
    endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
  };
}

/**
 * List all sessions, optionally filtered by curriculum
 */
export async function listSessions(curriculumId?: string): Promise<Session[]> {
  const dir = getSessionsDir();

  if (!existsSync(dir)) {
    return [];
  }

  const files = await readdir(dir);
  const sessionFiles = files.filter(f => f.endsWith('.json'));

  const sessions: Session[] = [];
  for (const file of sessionFiles) {
    try {
      const session = await loadSession(join(dir, file));
      if (!curriculumId || session.curriculumId === curriculumId) {
        sessions.push(session);
      }
    } catch {
      // Skip invalid session files
    }
  }

  // Sort by startedAt, most recent first
  sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return sessions;
}

/**
 * Find the most recent active session
 */
export async function findActiveSession(): Promise<Session | null> {
  const sessions = await listSessions();
  return sessions.find(s => s.status === 'active') || null;
}

/**
 * End a session with handoff information
 */
export async function endSession(
  session: Session,
  handoff: SessionHandoff
): Promise<string> {
  session.endedAt = new Date();
  session.status = 'completed';
  session.handoff = handoff;

  // Calculate time spent
  const start = new Date(session.startedAt).getTime();
  const end = new Date(session.endedAt).getTime();
  session.progress.timeSpentMinutes = Math.round((end - start) / (1000 * 60));

  const filePath = await saveSession(session);

  // Clear current session
  currentSession = null;

  return filePath;
}

/**
 * Mark an objective as complete
 */
export function markObjectiveComplete(session: Session, objectiveId: string): void {
  if (!session.progress.objectivesCompleted.includes(objectiveId)) {
    session.progress.objectivesCompleted.push(objectiveId);
  }
}

/**
 * Mark a deliverable as complete
 */
export function markDeliverableComplete(session: Session, deliverableId: string): void {
  if (!session.progress.deliverablesCompleted.includes(deliverableId)) {
    session.progress.deliverablesCompleted.push(deliverableId);
  }
}

/**
 * Add a note to the session
 */
export function addSessionNote(session: Session, note: string): void {
  session.notes.push(note);
}

/**
 * Record a question that was asked during the session
 */
export function addQuestionAsked(session: Session, question: string): void {
  session.questionsAsked.push(question);
}

/**
 * Generate a handoff summary based on session progress
 */
export function generateHandoff(
  session: Session,
  phase: Phase,
  additionalNotes?: string
): SessionHandoff {
  const completedObjectives = phase.objectives.filter(o =>
    session.progress.objectivesCompleted.includes(o.id)
  );
  const remainingObjectives = phase.objectives.filter(
    o => !session.progress.objectivesCompleted.includes(o.id)
  );

  const completedDeliverables = phase.deliverables.filter(d =>
    session.progress.deliverablesCompleted.includes(d.id)
  );
  const remainingDeliverables = phase.deliverables.filter(
    d => !session.progress.deliverablesCompleted.includes(d.id)
  );

  const completedWork = [
    ...completedObjectives.map(o => o.description),
    ...completedDeliverables.map(d => `Completed: ${d.title}`),
  ];

  const remainingWork = [
    ...remainingObjectives.map(o => o.description),
    ...remainingDeliverables.map(d => d.title),
  ];

  const nextSteps: string[] = [];
  const firstRemainingDeliverable = remainingDeliverables[0];
  const firstRemainingObjective = remainingObjectives[0];

  if (firstRemainingDeliverable) {
    nextSteps.push(`Start with: ${firstRemainingDeliverable.title}`);
  }
  if (firstRemainingObjective) {
    nextSteps.push(`Focus on: ${firstRemainingObjective.description}`);
  }
  if (session.notes.length > 0) {
    nextSteps.push(`Review notes from last session`);
  }

  const totalObjectives = phase.objectives.length;
  const totalDeliverables = phase.deliverables.length;
  const objProgress = `${completedObjectives.length}/${totalObjectives} objectives`;
  const delProgress = `${completedDeliverables.length}/${totalDeliverables} deliverables`;

  let summary = `Session on Phase ${session.phaseNumber}: ${session.phaseTitle}. `;
  summary += `Completed ${objProgress}, ${delProgress}. `;
  if (additionalNotes) {
    summary += additionalNotes;
  }

  let promptForNextSession = `Resume Phase ${session.phaseNumber} - ${session.phaseTitle}`;
  if (firstRemainingDeliverable) {
    promptForNextSession += `. Focus on: ${firstRemainingDeliverable.title}`;
  }
  if (firstRemainingObjective && !firstRemainingDeliverable) {
    promptForNextSession += `. Complete: ${firstRemainingObjective.description}`;
  }

  return {
    summary,
    completedWork,
    remainingWork,
    nextSteps,
    promptForNextSession,
  };
}

/**
 * Format session duration as human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Get session summary for display
 */
export function getSessionSummary(session: Session): {
  duration: string;
  objectivesCompleted: number;
  deliverablesCompleted: number;
  notes: number;
  questions: number;
} {
  let minutes = session.progress.timeSpentMinutes;

  // Calculate live duration if session is still active
  if (session.status === 'active' && !session.endedAt) {
    const start = new Date(session.startedAt).getTime();
    const now = Date.now();
    minutes = Math.round((now - start) / (1000 * 60));
  }

  return {
    duration: formatDuration(minutes),
    objectivesCompleted: session.progress.objectivesCompleted.length,
    deliverablesCompleted: session.progress.deliverablesCompleted.length,
    notes: session.notes.length,
    questions: session.questionsAsked.length,
  };
}
