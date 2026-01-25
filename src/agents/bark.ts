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
import { AgentTool, AgentFeedback, Curriculum } from '../types';

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
    {
      name: 'review_pedagogy',
      description: 'Assess the pedagogical soundness of a curriculum - learning flow, progression, and engagement',
      inputSchema: {
        type: 'object' as const,
        properties: {
          learningFlowScore: {
            type: 'number',
            description: 'Score for how well concepts flow from one to the next (1-10)',
            minimum: 1,
            maximum: 10,
          },
          progressionAssessment: {
            type: 'string',
            enum: ['too_fast', 'appropriate', 'too_slow'],
            description: 'Assessment of learning progression pace',
          },
          engagementLevel: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Predicted learner engagement level',
          },
          strengths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Pedagogical strengths of the curriculum',
          },
          concerns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                issue: { type: 'string' },
                phaseNumber: { type: 'number' },
                severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                suggestedFix: { type: 'string' },
              },
            },
            description: 'Pedagogical concerns with suggested improvements',
          },
          handsOnBalance: {
            type: 'string',
            description: 'Assessment of the balance between theory and hands-on practice',
          },
          motivationFactors: {
            type: 'array',
            items: { type: 'string' },
            description: 'Elements that will keep learners motivated',
          },
          overallAssessment: {
            type: 'string',
            description: 'Summary of pedagogical soundness',
          },
        },
        required: ['learningFlowScore', 'progressionAssessment', 'engagementLevel', 'overallAssessment'],
      },
      execute: async (input: unknown) => {
        const review = input as {
          learningFlowScore: number;
          progressionAssessment: 'too_fast' | 'appropriate' | 'too_slow';
          engagementLevel: 'low' | 'medium' | 'high';
          strengths?: string[];
          concerns?: Array<{ issue: string; phaseNumber?: number; severity: string; suggestedFix: string }>;
          handsOnBalance?: string;
          motivationFactors?: string[];
          overallAssessment: string;
        };

        // Convert concerns to AgentFeedback format
        const feedback: AgentFeedback[] = (review.concerns || []).map(concern => ({
          agentName: 'bark' as const,
          feedbackType: concern.severity === 'critical' ? 'blocker' : 'concern',
          category: 'pedagogical' as const,
          target: {
            type: concern.phaseNumber ? 'phase' as const : 'curriculum' as const,
            phaseNumber: concern.phaseNumber,
          },
          message: concern.issue,
          severity: concern.severity as 'low' | 'medium' | 'high' | 'critical',
          suggestedChange: concern.suggestedFix,
        }));

        // Add progression feedback if not appropriate
        if (review.progressionAssessment !== 'appropriate') {
          feedback.push({
            agentName: 'bark',
            feedbackType: 'concern',
            category: 'pedagogical',
            target: { type: 'curriculum' },
            message: `Learning progression is ${review.progressionAssessment === 'too_fast' ? 'too fast - learners may feel overwhelmed' : 'too slow - learners may lose interest'}`,
            severity: 'medium',
            suggestedChange: review.progressionAssessment === 'too_fast'
              ? 'Add more scaffolding or break complex topics into smaller steps'
              : 'Combine some phases or add more challenging deliverables',
          });
        }

        return {
          ...review,
          feedback,
          message: `Pedagogical review complete: ${review.learningFlowScore}/10 learning flow`,
        };
      },
    },
  ];

  /**
   * Review a curriculum and return structured pedagogical feedback
   */
  async reviewCurriculum(curriculum: Curriculum): Promise<{
    feedback: AgentFeedback[];
    pedagogyScore: number;
    summary: string;
  }> {
    // Set curriculum context
    this.setContext({ curriculum });

    // Build review prompt
    const prompt = `Please review this curriculum from a pedagogical perspective:

## Curriculum: ${curriculum.title}
**Topic:** ${curriculum.topic}
**Difficulty:** ${curriculum.metadata.difficulty}
**Target Audience:** ${curriculum.metadata.targetAudience}
**Total Hours:** ${curriculum.metadata.estimatedHours}

## Phases:
${curriculum.phases.map(phase => `
### Phase ${phase.number}: ${phase.title}
**Growth Stage:** ${phase.growthStage}
**Estimated Hours:** ${phase.estimatedHours}

**Objectives:**
${phase.objectives.map(obj => `- ${obj.description}`).join('\n')}

**Deliverables:**
${phase.deliverables.map(del => `- ${del.title}: ${del.description}
  Acceptance Criteria: ${del.acceptanceCriteria.join('; ')}`).join('\n')}

**Key Concepts:**
${phase.keyConcepts.map(kc => `- ${kc.term}: ${kc.definition}`).join('\n')}
`).join('\n')}

Please use the review_pedagogy tool to assess:
1. Learning flow - do concepts build on each other naturally?
2. Progression pace - is it appropriate for the target audience?
3. Engagement - will learners stay motivated?
4. Hands-on balance - enough practical exercises?
5. Any pedagogical concerns that should be addressed`;

    const response = await this.chat(prompt);

    // Collect feedback from tool calls
    const allFeedback: AgentFeedback[] = [];
    let pedagogyScore = 7; // Default score

    if (response.toolCalls) {
      for (const toolCall of response.toolCalls) {
        if (toolCall.output) {
          const output = toolCall.output as { feedback?: AgentFeedback[]; learningFlowScore?: number };

          if (output.feedback) {
            allFeedback.push(...output.feedback);
          }

          if (output.learningFlowScore) {
            pedagogyScore = output.learningFlowScore;
          }
        }
      }
    }

    return {
      feedback: allFeedback,
      pedagogyScore,
      summary: response.content,
    };
  }
}

// Export a factory function for easy instantiation
export function createBarkAgent(apiKey: string, model?: string): BarkAgent {
  return new BarkAgent(apiKey, model);
}
