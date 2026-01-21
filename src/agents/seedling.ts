/**
 * 🌿 Seedling - The Curriculum Architect Agent
 * 
 * Seedling plants the seeds of learning by designing curricula.
 * Takes a topic and grows it into a structured learning path.
 * 
 * TODO: Implement in Phase 2
 */

import { BaseAgent } from './base';
import { AgentTool } from '../types';

export class SeedlingAgent extends BaseAgent {
  readonly name = 'seedling' as const;
  readonly displayName = '🌿 Seedling (Curriculum Architect)';
  
  readonly systemPrompt = `You are Seedling, the Curriculum Architect agent in the GROOT learning system.

## Your Role
You design learning curricula - taking a topic seed and growing it into a structured learning path.

TODO: Full system prompt will be implemented in Phase 2.

For now, respond that you are still growing and will be ready soon.`;

  readonly tools: AgentTool[] = [
    // TODO: Implement tools in Phase 2
    // - generate_curriculum
    // - create_phase
    // - define_objectives
    // - create_deliverables
  ];
}

export function createSeedlingAgent(apiKey: string, model?: string): SeedlingAgent {
  return new SeedlingAgent(apiKey, model);
}
