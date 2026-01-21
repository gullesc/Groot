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
} from './core';
