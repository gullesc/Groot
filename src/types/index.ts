/**
 * GROOT Type Definitions
 * Core types for the curriculum generator system
 */

// ============================================================================
// Growth Stages
// ============================================================================

export type GrowthStage = 
  | 'seed'       // 🌰 Just starting
  | 'sprout'     // 🌱 First concepts
  | 'sapling'    // 🪴 Building foundations
  | 'tree'       // 🌳 Core competency
  | 'flowering'  // 🌸 Creative application
  | 'seeding'    // 🌾 Ready to teach
  | 'forest';    // 🌲🌳🌴 Mastery

export const GROWTH_STAGE_ICONS: Record<GrowthStage, string> = {
  seed: '🌰',
  sprout: '🌱',
  sapling: '🪴',
  tree: '🌳',
  flowering: '🌸',
  seeding: '🌾',
  forest: '🌲🌳🌴',
};

export const GROWTH_STAGE_ORDER: GrowthStage[] = [
  'seed', 'sprout', 'sapling', 'tree', 'flowering', 'seeding', 'forest'
];

// ============================================================================
// Curriculum Types
// ============================================================================

export interface Curriculum {
  id: string;
  title: string;
  description: string;
  topic: string;
  createdAt: Date;
  updatedAt: Date;
  phases: Phase[];
  currentPhaseIndex: number;
  growthStage: GrowthStage;
  metadata: CurriculumMetadata;
}

export interface CurriculumMetadata {
  estimatedHours: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  tags: string[];
  targetAudience: string;
}

export interface Phase {
  id: string;
  number: number;
  title: string;
  description: string;
  growthStage: GrowthStage;
  estimatedHours: number;
  objectives: LearningObjective[];
  deliverables: Deliverable[];
  keyConcepts: KeyConcept[];
  status: PhaseStatus;
  beadsEpicId?: string;  // Link to BEADS epic
}

export type PhaseStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface LearningObjective {
  id: string;
  description: string;
  completed: boolean;
}

export interface Deliverable {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  completed: boolean;
  beadsTaskId?: string;  // Link to BEADS task
}

export interface KeyConcept {
  term: string;
  definition: string;
  examples?: string[];
}

// ============================================================================
// Agent Types
// ============================================================================

export type AgentName = 'seedling' | 'bark' | 'canopy';

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentName?: AgentName;
}

export interface AgentContext {
  curriculum?: Curriculum;
  currentPhase?: Phase;
  conversationHistory: AgentMessage[];
  beadsContext?: BeadsContext;
}

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: unknown) => Promise<unknown>;
}

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  toolName: string;
  input: unknown;
  output?: unknown;
}

// ============================================================================
// BEADS Integration Types
// ============================================================================

export interface BeadsContext {
  projectPath: string;
  currentIssues: BeadsIssue[];
  readyWork: BeadsIssue[];
}

export interface BeadsIssue {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: number;  // 0-4, 0 = highest
  type: 'epic' | 'task' | 'bug' | 'feature' | 'chore';
  labels: string[];
  dependencies: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Session Types
// ============================================================================

export interface Session {
  id: string;
  curriculumId: string;
  startedAt: Date;
  endedAt?: Date;
  phaseId: string;
  notes: string[];
  questionsAsked: string[];
  progress: SessionProgress;
}

export interface SessionProgress {
  objectivesCompleted: string[];
  deliverablesCompleted: string[];
  timeSpentMinutes: number;
}

export interface SessionHandoff {
  summary: string;
  completedWork: string[];
  remainingWork: string[];
  nextSteps: string[];
  promptForNextSession: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface GrootConfig {
  anthropicApiKey?: string;
  defaultModel: string;
  beadsEnabled: boolean;
  debugMode: boolean;
  outputDir: string;
  templatesDir: string;
}

export const DEFAULT_CONFIG: GrootConfig = {
  defaultModel: 'claude-sonnet-4-20250514',
  beadsEnabled: true,
  debugMode: false,
  outputDir: './output',
  templatesDir: './templates',
};

// ============================================================================
// CLI Types
// ============================================================================

export interface CLIContext {
  config: GrootConfig;
  curriculum?: Curriculum;
  session?: Session;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}
