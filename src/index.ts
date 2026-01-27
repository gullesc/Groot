/**
 * GROOT - Guided Resource for Organized Objective Training
 * 
 * Main entry point for programmatic usage.
 * For CLI usage, see src/cli/index.ts
 */

// Export types
export * from './types';

// Export agents
export { 
  BaseAgent,
  BarkAgent, 
  SeedlingAgent, 
  CanopyAgent,
  createBarkAgent,
  createSeedlingAgent,
  createCanopyAgent,
} from './agents';

// Export core functionality
export {
  loadConfig,
  validateConfig,
  getConfig,
  isBeadsAvailable,
  isBeadsInitialized,
  initBeads,
  createIssue,
  getReadyWork,
  listIssues,
  updateIssueStatus,
  addDependency,
  getBeadsContext,
  syncBeads,
  addIssueComment,
  updateBeadsSessionProgress,
  // Orchestrator exports
  Orchestrator,
  createOrchestrator,
  // Journal exports
  saveJournalEntry,
  listJournalEntries,
  getJournalEntry,
  generateSlug,
  getJournalPath,
  // Session exports
  startSession,
  startSessionFromPath,
  getCurrentSession,
  setCurrentSession,
  hasActiveSession,
  saveSession,
  loadSession,
  listSessions,
  findActiveSession,
  endSession,
  markObjectiveComplete,
  markDeliverableComplete,
  addSessionNote,
  addQuestionAsked,
  generateHandoff,
  formatDuration,
  getSessionSummary,
  getSessionsDir,
  // Curriculum functions
  loadCurriculumJSON,
  updatePhaseStatus,
  updateCurriculumProgress,
  getCurrentCurriculum,
  getCurriculumSummary,
  saveCurriculum,
  // Path functions
  getGrootDir,
  getCurriculumPath,
  getJournalDir,
  isGrootInitialized,
  hasCurriculum,
  initGrootDir,
  ensureGrootDir,
  // Scaffold functions
  scaffoldPhase,
  generateFileName,
  toPascalCase,
  toSnakeCase,
  generateTodoComments,
  getAvailableTemplateTypes,
  getTemplate,
  validateScaffoldOptions,
} from './core';

// Export template functions
export {
  getTemplateDefinition,
  getAvailableTemplates,
  getAllTemplateDefinitions,
} from './templates';
