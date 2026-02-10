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
  templateType?: TemplateType;  // Saved template choice for consistent scaffolding
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

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export interface Session {
  id: string;
  curriculumId: string;
  curriculumPath: string;      // Path to curriculum file
  curriculumTitle: string;     // For display
  phaseNumber: number;         // For display
  phaseTitle: string;          // For display
  phaseId: string;
  startedAt: Date;
  endedAt?: Date;
  status: SessionStatus;
  notes: string[];
  questionsAsked: string[];
  progress: SessionProgress;
  handoff?: SessionHandoff;    // Populated on rest
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

// ============================================================================
// Orchestration Types (Phase 3)
// ============================================================================

export interface AgentFeedback {
  agentName: AgentName;
  feedbackType: 'approval' | 'concern' | 'suggestion' | 'blocker';
  category: 'technical' | 'pedagogical' | 'sequencing' | 'scope';
  target: {
    type: 'curriculum' | 'phase' | 'deliverable';
    phaseNumber?: number;
    deliverableId?: string;
  };
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedChange?: string;
}

export interface AgentHandoff {
  fromAgent: AgentName;
  toAgent: AgentName;
  curriculum: Curriculum;
  feedback: AgentFeedback[];
  context: SharedContext;
}

export interface SharedContext {
  originalTopic: string;
  reviewRound: number;
  agentContributions: Record<AgentName, string[]>;
  consensusReached: boolean;
}

export interface OrchestrationResult {
  success: boolean;
  finalCurriculum: Curriculum;
  allFeedback: AgentFeedback[];
  appliedChanges: string[];
  unresolvedIssues: AgentFeedback[];
}

// ============================================================================
// Learning Journal Types (Phase 3)
// ============================================================================

export interface JournalEntry {
  slug: string;
  title: string;
  content: string;
  capturedAt: Date;
  context?: JournalContext;
  takeaways?: string[];
  relatedTopics?: string[];
}

export interface JournalContext {
  phase?: string;
  curriculumId?: string;
  activity?: string;
}

// ============================================================================
// Scaffolding Types (Phase 5)
// ============================================================================

export type TemplateType = 'typescript' | 'javascript' | 'python' | 'minimal' | 'react' | 'vue' | string;

export interface ScaffoldOptions {
  phaseNumber: number;
  templateType: TemplateType;
  outputDir: string;
  dryRun: boolean;
  force: boolean;
  verbose: boolean;
  tdd?: boolean;  // Generate working tests using Claude (true TDD workflow)
}

export interface ScaffoldFile {
  path: string;               // Relative path from output dir
  content: string;            // File content (empty for directories)
  type: 'file' | 'directory';
}

export interface ScaffoldResult {
  success: boolean;
  filesCreated: string[];
  filesSkipped: string[];
  errors: string[];
}

export interface ScaffoldContext {
  curriculum: Curriculum;
  phase: Phase;
  template: TemplateType;
  outputDir: string;
}

export interface TemplateDefinition {
  name: TemplateType;
  displayName: string;
  description: string;
  fileExtension: string;
  generateFiles: (context: ScaffoldContext) => ScaffoldFile[];
}

// ============================================================================
// Phase 6: Extensibility Types
// ============================================================================

/**
 * LLM Provider configuration (supports Anthropic, Ollama, OpenAI)
 */
export interface LLMProviderConfig {
  provider: 'anthropic' | 'ollama' | 'openai';
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

/**
 * Custom agent prompt overrides
 */
export interface AgentPromptOverrides {
  seedling?: string;
  bark?: string;
  canopy?: string;
}

/**
 * Post-scaffold hook definition
 */
export interface HookDefinition {
  name: string;
  command: string;
  args?: string[];
  cwd?: string;
  runIf?: 'always' | string;  // 'always' or 'file-exists:filename'
  continueOnError?: boolean;
}

/**
 * Hook configuration for a template
 */
export interface TemplateHooksConfig {
  enabled: boolean;
  hooks?: HookDefinition[];
}

/**
 * Extended template definition with hooks
 */
export interface ExtendedTemplateDefinition extends TemplateDefinition {
  defaultHooks?: HookDefinition[];
}

/**
 * Extended GROOT configuration with Phase 6 features
 */
export interface ExtendedGrootConfig extends GrootConfig {
  llm?: LLMProviderConfig;
  agentPrompts?: AgentPromptOverrides;
  defaultTemplate?: TemplateType;
  hooks?: {
    defaults?: Record<string, TemplateHooksConfig>;
  };
  templates?: {
    userDir?: string;
    projectDir?: string;
  };
}

/**
 * Default extended configuration
 */
export const DEFAULT_EXTENDED_CONFIG: ExtendedGrootConfig = {
  ...DEFAULT_CONFIG,
  llm: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
  },
  defaultTemplate: 'typescript',
  hooks: {
    defaults: {
      typescript: { enabled: true },
      javascript: { enabled: true },
      python: { enabled: true },
      react: { enabled: true },
      vue: { enabled: true },
      minimal: { enabled: false },
    },
  },
  templates: {
    userDir: '~/.groot/templates',
    projectDir: './templates',
  },
};

/**
 * Custom template YAML definition (for plugin discovery)
 */
export interface CustomTemplateYaml {
  name: string;
  displayName: string;
  description: string;
  fileExtension: string;
  files?: Array<{
    path: string;
    content?: string;
    type?: 'file' | 'directory';
  }>;
  deliverableTemplate?: {
    pathPattern: string;
    content: string;
  };
  hooks?: {
    postScaffold?: HookDefinition[];
  };
}

// ============================================================================
// Spec-Driven Development (SDD) Types
// ============================================================================

/**
 * Raw spec artifacts generated by Claude API
 */
export interface SpecArtifacts {
  spec: string;   // spec.md content
  plan: string;   // plan.md content
  tasks: string;  // tasks.md content
}

/**
 * Options for spec generation
 */
export interface SpecGenerationOptions {
  outputDir: string;
  phaseNumber: number;
  curriculum: Curriculum;
  templateType: TemplateType;
  dryRun?: boolean;
  verbose?: boolean;
  force?: boolean;  // overwrite existing specs
}

/**
 * Result of generating specs for a single deliverable
 */
export interface SpecGenerationResult {
  deliverableTitle: string;
  deliverableId?: string;
  specDir?: string;
  filesCreated: string[];
  filesSkipped: string[];
  error?: string;
}

/**
 * Result of generating specs for an entire phase
 */
export interface PhaseSpecResults {
  phase: number;
  results: SpecGenerationResult[];
  constitutionGenerated: boolean;
  success: boolean;
  error?: string;
}

/**
 * Result of validating specs for a single deliverable
 */
export interface SpecValidationResult {
  deliverableTitle: string;
  deliverableId?: string;
  specExists: boolean;
  planExists: boolean;
  tasksExists: boolean;
  issues: string[];
}

/**
 * Result of validating specs for an entire phase
 */
export interface PhaseSpecValidation {
  phase: number;
  constitutionValid: boolean;
  results: SpecValidationResult[];
  allValid: boolean;
}

/**
 * Constitution configuration derived from curriculum
 */
export interface ConstitutionConfig {
  projectName: string;
  topic: string;
  language: TemplateType;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  codingStandards: string[];
  testFramework: string;
  testCommand: string;
  restrictions: string[];
}

/**
 * Extended scaffold options with SDD support
 */
export interface ExtendedScaffoldOptions extends ScaffoldOptions {
  skipSpecs?: boolean;  // Skip SDD artifact generation
}

/**
 * Extended scaffold result with SDD artifacts
 */
export interface ExtendedScaffoldResult extends ScaffoldResult {
  hooksExecuted?: Array<{ name: string; success: boolean; error?: string }>;
  testsGenerated?: Array<{ deliverable: string; testFile: string }>;
  specsGenerated?: string[];      // List of spec file paths
  constitutionPath?: string;      // Constitution file path
}

// ============================================================================
// Clarification Types (Interactive Agent Queries)
// ============================================================================

/**
 * Request from an agent to clarify an unfamiliar term or concept
 */
export interface ClarificationRequest {
  question: string;           // The clarifying question to ask
  context?: string;           // Why the agent needs this clarification
  unknownTerm?: string;       // The specific term that's unfamiliar
}

/**
 * User's response to a clarification request
 */
export interface ClarificationResponse {
  answer: string;             // The user's answer
  additionalContext?: string; // Optional extra context (e.g., pasted documentation)
  skipped: boolean;           // True if user declined to answer
}

/**
 * Callback type for handling clarification requests from agents
 */
export type ClarificationCallback = (
  request: ClarificationRequest
) => Promise<ClarificationResponse>;

// ============================================================================
// Q&A History Types
// ============================================================================

/**
 * Context for a Q&A entry (auto-tagged from active curriculum/phase)
 */
export interface QAContext {
  curriculumId?: string;
  curriculumTitle?: string;
  phaseNumber?: number;
  phaseTitle?: string;
  growthStage?: GrowthStage;
}

/**
 * A single Q&A interaction entry
 */
export interface QAHistoryEntry {
  id: string;                    // UUID
  question: string;              // User's question
  answer: string;                // Bark's response
  timestamp: Date;               // When asked
  context: QAContext;            // Auto-tagged phase/curriculum
  sessionId?: string;            // Active session ID if present
}

/**
 * The full Q&A history file structure
 */
export interface QAHistory {
  version: string;               // Schema version for future migrations
  entries: QAHistoryEntry[];     // All Q&A entries
  lastUpdated: Date;
}
