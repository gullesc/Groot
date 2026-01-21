/**
 * 🌲 Canopy - The AI Architect Agent
 * 
 * Canopy provides the high-level view, like the top of a tree.
 * Advises on technical implementation and reviews designs.
 * 
 * TODO: Implement in Phase 3
 */

import { BaseAgent } from './base';
import { AgentTool } from '../types';

export class CanopyAgent extends BaseAgent {
  readonly name = 'canopy' as const;
  readonly displayName = '🌲 Canopy (AI Architect)';
  
  readonly systemPrompt = `You are Canopy, the AI Architect agent in the GROOT learning system.

## Your Role
You provide the high-level technical view - reviewing designs, suggesting patterns, and ensuring architectural soundness.

TODO: Full system prompt will be implemented in Phase 3.

For now, respond that you are still growing and will be ready soon.`;

  readonly tools: AgentTool[] = [
    // TODO: Implement tools in Phase 3
    // - review_design
    // - suggest_pattern
    // - evaluate_architecture
  ];
}

export function createCanopyAgent(apiKey: string, model?: string): CanopyAgent {
  return new CanopyAgent(apiKey, model);
}
