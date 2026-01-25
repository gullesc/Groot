/**
 * GROOT Orchestrator
 *
 * Central coordinator for multi-agent curriculum creation and review.
 * Implements hub-and-spoke communication pattern where all agents
 * communicate through the orchestrator rather than directly.
 *
 * Pipeline: Seedling (generate) -> Canopy (technical review) -> Bark (pedagogical review) -> Merge
 */

import { createSeedlingAgent, SeedlingAgent } from '../agents/seedling';
import { createCanopyAgent, CanopyAgent } from '../agents/canopy';
import { createBarkAgent, BarkAgent } from '../agents/bark';
import {
  Curriculum,
  AgentFeedback,
  SharedContext,
  OrchestrationResult,
} from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface OrchestratorConfig {
  apiKey: string;
  model?: string;
  verbose?: boolean;
}

export interface OrchestratorCallbacks {
  onPhaseStart?: (phase: string) => void;
  onPhaseComplete?: (phase: string, success: boolean) => void;
  onFeedback?: (feedback: AgentFeedback) => void;
  onLog?: (message: string) => void;
}

export class Orchestrator {
  private seedling: SeedlingAgent;
  private canopy: CanopyAgent;
  private bark: BarkAgent;
  private verbose: boolean;
  private callbacks: OrchestratorCallbacks;

  constructor(config: OrchestratorConfig, callbacks: OrchestratorCallbacks = {}) {
    this.seedling = createSeedlingAgent(config.apiKey, config.model);
    this.canopy = createCanopyAgent(config.apiKey, config.model);
    this.bark = createBarkAgent(config.apiKey, config.model);
    this.verbose = config.verbose || false;
    this.callbacks = callbacks;
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
    this.callbacks.onLog?.(message);
  }

  /**
   * Main entry point - orchestrate curriculum generation and review
   */
  async orchestrateGrow(
    topicOrFile: string,
    options: { fromFile?: boolean } = {}
  ): Promise<OrchestrationResult> {
    const context: SharedContext = {
      originalTopic: topicOrFile,
      reviewRound: 1,
      agentContributions: {
        seedling: [],
        bark: [],
        canopy: [],
      },
      consensusReached: false,
    };

    try {
      // Step 1: Generate or load curriculum
      this.callbacks.onPhaseStart?.('generate');
      const curriculum = options.fromFile
        ? await this.loadCurriculum(topicOrFile)
        : await this.generateCurriculum(topicOrFile, context);
      this.callbacks.onPhaseComplete?.('generate', true);

      // Step 2: Technical review by Canopy
      this.callbacks.onPhaseStart?.('technical-review');
      const technicalReview = await this.technicalReview(curriculum, context);
      this.callbacks.onPhaseComplete?.('technical-review', true);

      // Step 3: Pedagogical review by Bark
      this.callbacks.onPhaseStart?.('pedagogical-review');
      const pedagogicalReview = await this.pedagogicalReview(curriculum, context);
      this.callbacks.onPhaseComplete?.('pedagogical-review', true);

      // Step 4: Merge feedback and produce final curriculum
      this.callbacks.onPhaseStart?.('merge');
      const result = await this.mergeFeedback(
        curriculum,
        [...technicalReview.feedback, ...pedagogicalReview.feedback],
        context
      );
      this.callbacks.onPhaseComplete?.('merge', true);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Orchestration failed: ${errorMessage}`);
    }
  }

  /**
   * Generate a new curriculum using Seedling
   */
  async generateCurriculum(topic: string, context: SharedContext): Promise<Curriculum> {
    this.log(`Generating curriculum for: ${topic}`);

    const prompt = `Generate a comprehensive, project-based learning curriculum for: "${topic}"

Please create a curriculum with:
- 4-6 progressive phases
- Clear learning objectives for each phase
- Hands-on deliverables (things to build)
- Key concepts and definitions
- Realistic time estimates

Use the generate_curriculum_structure tool to output the curriculum in the proper format.`;

    const response = await this.seedling.chat(prompt);

    if (!response.toolCalls || response.toolCalls.length === 0) {
      throw new Error('Seedling did not generate a curriculum structure');
    }

    const curriculumTool = response.toolCalls.find(
      tc => tc.toolName === 'generate_curriculum_structure'
    );

    if (!curriculumTool || !curriculumTool.output) {
      throw new Error('Failed to extract curriculum from Seedling response');
    }

    const { curriculum } = curriculumTool.output as { curriculum: Curriculum };
    context.agentContributions.seedling.push('Generated initial curriculum structure');

    return curriculum;
  }

  /**
   * Load an existing curriculum from a file
   */
  async loadCurriculum(filePath: string): Promise<Curriculum> {
    this.log(`Loading curriculum from: ${filePath}`);

    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Curriculum file not found: ${absolutePath}`);
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');

    // Handle both JSON and markdown files
    if (filePath.endsWith('.json')) {
      return JSON.parse(content) as Curriculum;
    }

    // For markdown, we need to parse or throw an error
    throw new Error('Loading from markdown is not yet supported. Please provide a JSON file.');
  }

  /**
   * Technical review by Canopy
   */
  async technicalReview(
    curriculum: Curriculum,
    context: SharedContext
  ): Promise<{ feedback: AgentFeedback[]; score: number }> {
    this.log('Canopy is reviewing technical feasibility...');

    const result = await this.canopy.reviewCurriculum(curriculum);

    // Emit feedback through callbacks
    for (const feedback of result.feedback) {
      this.callbacks.onFeedback?.(feedback);
    }

    context.agentContributions.canopy.push(
      `Technical review: ${result.technicalScore}/10`,
      ...result.feedback.map(f => f.message)
    );

    return {
      feedback: result.feedback,
      score: result.technicalScore,
    };
  }

  /**
   * Pedagogical review by Bark
   */
  async pedagogicalReview(
    curriculum: Curriculum,
    context: SharedContext
  ): Promise<{ feedback: AgentFeedback[]; score: number }> {
    this.log('Bark is reviewing pedagogical soundness...');

    const result = await this.bark.reviewCurriculum(curriculum);

    // Emit feedback through callbacks
    for (const feedback of result.feedback) {
      this.callbacks.onFeedback?.(feedback);
    }

    context.agentContributions.bark.push(
      `Pedagogical review: ${result.pedagogyScore}/10`,
      ...result.feedback.map(f => f.message)
    );

    return {
      feedback: result.feedback,
      score: result.pedagogyScore,
    };
  }

  /**
   * Merge feedback from all agents and apply changes
   */
  async mergeFeedback(
    curriculum: Curriculum,
    allFeedback: AgentFeedback[],
    context: SharedContext
  ): Promise<OrchestrationResult> {
    this.log('Merging feedback from all agents...');

    // Categorize feedback by target
    const byPhase = new Map<number, AgentFeedback[]>();
    const curriculumLevel: AgentFeedback[] = [];

    for (const feedback of allFeedback) {
      if (feedback.target.type === 'phase' && feedback.target.phaseNumber) {
        const existing = byPhase.get(feedback.target.phaseNumber) || [];
        existing.push(feedback);
        byPhase.set(feedback.target.phaseNumber, existing);
      } else {
        curriculumLevel.push(feedback);
      }
    }

    // Detect conflicts
    const { conflicts, nonConflicting } = this.detectConflicts(allFeedback);

    // Apply non-conflicting changes
    const appliedChanges: string[] = [];
    const updatedCurriculum = { ...curriculum };

    for (const feedback of nonConflicting) {
      // For now, we'll record what would be changed
      // Actual curriculum modification would require more complex logic
      if (feedback.suggestedChange) {
        appliedChanges.push(
          `[${feedback.agentName}] ${feedback.category}: ${feedback.suggestedChange}`
        );
      }
    }

    // Flag conflicts as unresolved
    const unresolvedIssues: AgentFeedback[] = [
      ...conflicts,
      ...allFeedback.filter(f => f.severity === 'critical'),
    ];

    // Determine if consensus was reached
    context.consensusReached =
      unresolvedIssues.length === 0 &&
      !allFeedback.some(f => f.feedbackType === 'blocker');

    return {
      success: context.consensusReached || unresolvedIssues.length === 0,
      finalCurriculum: updatedCurriculum,
      allFeedback,
      appliedChanges,
      unresolvedIssues,
    };
  }

  /**
   * Detect conflicting feedback between agents
   */
  private detectConflicts(feedback: AgentFeedback[]): {
    conflicts: AgentFeedback[];
    nonConflicting: AgentFeedback[];
  } {
    const conflicts: AgentFeedback[] = [];
    const nonConflicting: AgentFeedback[] = [];

    // Group feedback by target
    const byTarget = new Map<string, AgentFeedback[]>();

    for (const f of feedback) {
      const key = `${f.target.type}-${f.target.phaseNumber || 'all'}`;
      const existing = byTarget.get(key) || [];
      existing.push(f);
      byTarget.set(key, existing);
    }

    // Check each group for conflicts
    for (const [, group] of byTarget) {
      // Look for opposing suggestions from different agents
      const canopyFeedback = group.filter(f => f.agentName === 'canopy');
      const barkFeedback = group.filter(f => f.agentName === 'bark');

      // Simple conflict detection: opposite suggestions
      // e.g., "add complexity" vs "simplify"
      const hasConflict = this.checkForOpposingSuggestions(canopyFeedback, barkFeedback);

      if (hasConflict) {
        conflicts.push(...canopyFeedback, ...barkFeedback);
      } else {
        nonConflicting.push(...group);
      }
    }

    return { conflicts, nonConflicting };
  }

  /**
   * Check if feedback from different agents has opposing suggestions
   */
  private checkForOpposingSuggestions(
    canopyFeedback: AgentFeedback[],
    barkFeedback: AgentFeedback[]
  ): boolean {
    // Keywords that might indicate opposing suggestions
    const complexityUp = ['add', 'increase', 'more', 'advanced', 'complex'];
    const complexityDown = ['simplify', 'reduce', 'less', 'basic', 'remove'];

    const canopyWantsMore = canopyFeedback.some(f =>
      complexityUp.some(word => f.message.toLowerCase().includes(word))
    );
    const canopyWantsLess = canopyFeedback.some(f =>
      complexityDown.some(word => f.message.toLowerCase().includes(word))
    );

    const barkWantsMore = barkFeedback.some(f =>
      complexityUp.some(word => f.message.toLowerCase().includes(word))
    );
    const barkWantsLess = barkFeedback.some(f =>
      complexityDown.some(word => f.message.toLowerCase().includes(word))
    );

    // Conflict if one wants more and other wants less
    return (canopyWantsMore && barkWantsLess) || (canopyWantsLess && barkWantsMore);
  }
}

/**
 * Factory function to create an orchestrator
 */
export function createOrchestrator(
  config: OrchestratorConfig,
  callbacks?: OrchestratorCallbacks
): Orchestrator {
  return new Orchestrator(config, callbacks);
}
