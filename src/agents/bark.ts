/**
 * 🪵 Bark - The Tutor Agent
 * 
 * Bark is the protective guide through your learning journey.
 * Like tree bark that protects and nurtures, Bark:
 * - Answers questions about concepts you're learning
 * - Provides feedback on your deliverables
 * - Catches misconceptions before they take root
 * - Encourages growth with patience and clarity
 */

import { BaseAgent } from './base';
import { AgentTool } from '../types';

export class BarkAgent extends BaseAgent {
  readonly name = 'bark' as const;
  readonly displayName = '🪵 Bark (Tutor)';
  
  readonly systemPrompt = `You are Bark, the Tutor agent in the GROOT learning system. Your name comes from tree bark - the protective layer that nurtures growth.

## Your Personality
- Patient and encouraging, like a wise mentor
- You celebrate progress, no matter how small ("Every mighty oak started as an acorn")
- You use growth metaphors naturally: "Let's dig deeper into that concept", "That idea is really taking root"
- You're honest about gaps in understanding, but frame them as opportunities to grow

## Your Role
You help learners understand concepts within their current curriculum. You:
1. Answer questions clearly, adapting complexity to the learner's level
2. Provide examples and analogies to make abstract concepts concrete
3. Catch and gently correct misconceptions
4. Connect new concepts to things already learned (building on existing roots)
5. Encourage hands-on experimentation

## Teaching Style
- Start with the "why" before the "how"
- Use concrete examples before abstract principles
- Ask clarifying questions to understand where the learner is stuck
- Break complex topics into digestible pieces
- Celebrate "aha moments" - they're signs of growth!

## BEADS Integration
When the learner asks about something outside the current phase or curriculum:
- Acknowledge their curiosity (branching out is natural!)
- Suggest filing it as a BEADS issue for future exploration
- Gently guide back to the current learning objectives

## Response Format
- Keep responses focused and digestible
- Use markdown formatting for code examples
- Include "🌱 Growth Tip:" callouts for important insights
- End complex explanations with a simple summary

Remember: Your job is not to give answers, but to help understanding take root.`;

  readonly tools: AgentTool[] = [
    {
      name: 'check_understanding',
      description: 'Generate a quick question to check if the learner understood a concept',
      inputSchema: {
        type: 'object' as const,
        properties: {
          concept: {
            type: 'string',
            description: 'The concept to check understanding of',
          },
          difficulty: {
            type: 'string',
            enum: ['easy', 'medium', 'hard'],
            description: 'Difficulty level of the check question',
          },
        },
        required: ['concept'],
      },
      execute: async (input: unknown) => {
        const { concept, difficulty = 'medium' } = input as { concept: string; difficulty?: string };
        // In Phase 1, this will be implemented to generate questions
        return {
          concept,
          difficulty,
          message: `[Tool: check_understanding] Would generate a ${difficulty} question about "${concept}"`,
        };
      },
    },
    {
      name: 'suggest_exercise',
      description: 'Suggest a hands-on exercise to practice a concept',
      inputSchema: {
        type: 'object' as const,
        properties: {
          concept: {
            type: 'string',
            description: 'The concept to practice',
          },
          timeMinutes: {
            type: 'number',
            description: 'Suggested time for the exercise in minutes',
          },
        },
        required: ['concept'],
      },
      execute: async (input: unknown) => {
        const { concept, timeMinutes = 15 } = input as { concept: string; timeMinutes?: number };
        return {
          concept,
          timeMinutes,
          message: `[Tool: suggest_exercise] Would suggest a ${timeMinutes}-minute exercise for "${concept}"`,
        };
      },
    },
    {
      name: 'log_topic_discussed',
      description: 'Log a topic that was discussed for tracking in BEADS',
      inputSchema: {
        type: 'object' as const,
        properties: {
          topic: {
            type: 'string',
            description: 'The topic that was discussed',
          },
          understanding: {
            type: 'string',
            enum: ['struggling', 'developing', 'solid', 'mastered'],
            description: 'Learner\'s apparent understanding level',
          },
          notes: {
            type: 'string',
            description: 'Any notes about the discussion',
          },
        },
        required: ['topic'],
      },
      execute: async (input: unknown) => {
        const { topic, understanding = 'developing', notes } = input as { 
          topic: string; 
          understanding?: string; 
          notes?: string;
        };
        // TODO: Integrate with BEADS in Phase 1
        console.log(`[Bark] Logged topic: ${topic} (${understanding})`);
        return {
          logged: true,
          topic,
          understanding,
          notes,
        };
      },
    },
  ];
}

// Export a factory function for easy instantiation
export function createBarkAgent(apiKey: string, model?: string): BarkAgent {
  return new BarkAgent(apiKey, model);
}
