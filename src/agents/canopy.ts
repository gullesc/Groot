/**
 * 🌲 Canopy - The AI Architect Agent
 *
 * Canopy provides the high-level view, like the top of a tree.
 * Advises on technical implementation and reviews designs.
 */

import { BaseAgent } from './base';
import { AgentTool, AgentFeedback, Curriculum } from '../types';

export class CanopyAgent extends BaseAgent {
  readonly name = 'canopy' as const;
  readonly displayName = '🌲 Canopy (AI Architect)';

  readonly systemPrompt = `You are Canopy, the AI Architect agent in the GROOT learning system. Your name comes from the tree canopy - the highest vantage point that sees the whole forest.

## Your Personality
- Strategic and analytical, like an experienced software architect
- You think in systems: components, dependencies, scalability
- You use forest metaphors naturally: "I see the whole picture from up here", "Let's ensure these branches connect properly"
- You're direct but constructive - you identify issues AND propose solutions

## Your Role
You provide high-level technical review of learning curricula. You:
1. Evaluate whether deliverables are technically feasible
2. Identify missing prerequisites or knowledge gaps
3. Suggest appropriate design patterns and architectures
4. Ensure proper sequencing of technical concepts
5. Flag unrealistic scope or complexity issues

## Review Criteria

### Technical Feasibility
- Can this actually be built with the specified technologies?
- Are the time estimates realistic for the complexity?
- Are there hidden dependencies not mentioned?

### Architecture Soundness
- Does the learning path build technical skills progressively?
- Are appropriate patterns being taught at the right stages?
- Will learners understand WHY certain patterns are used?

### Scope Assessment
- Is the scope appropriate for the target audience?
- Are deliverables specific enough to be evaluated?
- Is there a clear path from simple to complex?

## Feedback Guidelines
- Be specific: "Phase 3 introduces microservices before teaching HTTP basics in Phase 2"
- Be constructive: Always include a suggested fix
- Prioritize: Mark blockers vs nice-to-haves clearly
- Stay in your lane: Focus on technical aspects, leave pedagogy to Bark

## Severity Levels
- **critical**: Cannot proceed without addressing (wrong, broken, impossible)
- **high**: Significant issue that will cause problems
- **medium**: Should be addressed for quality
- **low**: Minor improvement or polish

When reviewing a curriculum, use the provided tools to give structured feedback.`;

  readonly tools: AgentTool[] = [
    {
      name: 'review_design',
      description: 'Provide an overall assessment of the curriculum design from a technical perspective',
      inputSchema: {
        type: 'object' as const,
        properties: {
          feasibilityScore: {
            type: 'number',
            description: 'Overall technical feasibility score from 1-10',
            minimum: 1,
            maximum: 10,
          },
          strengths: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of technical strengths in the curriculum',
          },
          concerns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                issue: { type: 'string' },
                severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                suggestedFix: { type: 'string' },
              },
            },
            description: 'List of technical concerns with suggested fixes',
          },
          missingPrerequisites: {
            type: 'array',
            items: { type: 'string' },
            description: 'Prerequisites that should be added but are missing',
          },
          overallAssessment: {
            type: 'string',
            description: 'Summary assessment of the curriculum from a technical standpoint',
          },
        },
        required: ['feasibilityScore', 'strengths', 'concerns', 'overallAssessment'],
      },
      execute: async (input: unknown) => {
        const review = input as {
          feasibilityScore: number;
          strengths: string[];
          concerns: Array<{ issue: string; severity: string; suggestedFix: string }>;
          missingPrerequisites?: string[];
          overallAssessment: string;
        };

        // Convert concerns to AgentFeedback format
        const feedback: AgentFeedback[] = review.concerns.map(concern => ({
          agentName: 'canopy' as const,
          feedbackType: concern.severity === 'critical' ? 'blocker' : 'concern',
          category: 'technical' as const,
          target: { type: 'curriculum' as const },
          message: concern.issue,
          severity: concern.severity as 'low' | 'medium' | 'high' | 'critical',
          suggestedChange: concern.suggestedFix,
        }));

        return {
          ...review,
          feedback,
          message: `Technical review complete: ${review.feasibilityScore}/10 feasibility`,
        };
      },
    },
    {
      name: 'suggest_pattern',
      description: 'Recommend a design pattern or architectural approach for a specific phase or deliverable',
      inputSchema: {
        type: 'object' as const,
        properties: {
          targetPhase: {
            type: 'number',
            description: 'The phase number this suggestion applies to',
          },
          patternName: {
            type: 'string',
            description: 'Name of the recommended pattern (e.g., "Repository Pattern", "MVC", "Event Sourcing")',
          },
          rationale: {
            type: 'string',
            description: 'Why this pattern is appropriate for this learning stage',
          },
          implementationNotes: {
            type: 'string',
            description: 'Key points for implementing this pattern in the curriculum',
          },
          prerequisitePatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Patterns that should be learned before this one',
          },
        },
        required: ['targetPhase', 'patternName', 'rationale'],
      },
      execute: async (input: unknown) => {
        const suggestion = input as {
          targetPhase: number;
          patternName: string;
          rationale: string;
          implementationNotes?: string;
          prerequisitePatterns?: string[];
        };

        const feedback: AgentFeedback = {
          agentName: 'canopy',
          feedbackType: 'suggestion',
          category: 'technical',
          target: { type: 'phase', phaseNumber: suggestion.targetPhase },
          message: `Consider teaching "${suggestion.patternName}" pattern: ${suggestion.rationale}`,
          severity: 'medium',
          suggestedChange: suggestion.implementationNotes,
        };

        return {
          ...suggestion,
          feedback,
          message: `Pattern suggestion for Phase ${suggestion.targetPhase}: ${suggestion.patternName}`,
        };
      },
    },
    {
      name: 'evaluate_architecture',
      description: 'Evaluate the technical architecture of a specific phase',
      inputSchema: {
        type: 'object' as const,
        properties: {
          phaseNumber: {
            type: 'number',
            description: 'The phase number to evaluate',
          },
          architectureScore: {
            type: 'number',
            description: 'Architecture soundness score from 1-10',
            minimum: 1,
            maximum: 10,
          },
          conceptsWellSequenced: {
            type: 'boolean',
            description: 'Whether technical concepts are introduced in the right order',
          },
          missingConcepts: {
            type: 'array',
            items: { type: 'string' },
            description: 'Technical concepts that should be included but are missing',
          },
          knowledgeGaps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                gap: { type: 'string' },
                neededBefore: { type: 'string' },
              },
            },
            description: 'Knowledge gaps where something is used before it is taught',
          },
          notes: {
            type: 'string',
            description: 'Additional notes about the phase architecture',
          },
        },
        required: ['phaseNumber', 'architectureScore', 'conceptsWellSequenced'],
      },
      execute: async (input: unknown) => {
        const evaluation = input as {
          phaseNumber: number;
          architectureScore: number;
          conceptsWellSequenced: boolean;
          missingConcepts?: string[];
          knowledgeGaps?: Array<{ gap: string; neededBefore: string }>;
          notes?: string;
        };

        const feedback: AgentFeedback[] = [];

        // Add feedback for knowledge gaps
        if (evaluation.knowledgeGaps && evaluation.knowledgeGaps.length > 0) {
          evaluation.knowledgeGaps.forEach(gap => {
            feedback.push({
              agentName: 'canopy',
              feedbackType: 'concern',
              category: 'sequencing',
              target: { type: 'phase', phaseNumber: evaluation.phaseNumber },
              message: `Knowledge gap: "${gap.gap}" is needed before "${gap.neededBefore}"`,
              severity: 'high',
              suggestedChange: `Introduce ${gap.gap} before teaching ${gap.neededBefore}`,
            });
          });
        }

        // Add feedback for missing concepts
        if (evaluation.missingConcepts && evaluation.missingConcepts.length > 0) {
          feedback.push({
            agentName: 'canopy',
            feedbackType: 'suggestion',
            category: 'technical',
            target: { type: 'phase', phaseNumber: evaluation.phaseNumber },
            message: `Missing concepts: ${evaluation.missingConcepts.join(', ')}`,
            severity: 'medium',
            suggestedChange: `Add key concepts: ${evaluation.missingConcepts.join(', ')}`,
          });
        }

        return {
          ...evaluation,
          feedback,
          message: `Phase ${evaluation.phaseNumber} architecture: ${evaluation.architectureScore}/10`,
        };
      },
    },
  ];

  /**
   * Review a curriculum and return structured feedback
   */
  async reviewCurriculum(curriculum: Curriculum): Promise<{
    feedback: AgentFeedback[];
    technicalScore: number;
    summary: string;
  }> {
    // Set curriculum context
    this.setContext({ curriculum });

    // Build review prompt
    const prompt = `Please review this curriculum from a technical architecture perspective:

## Curriculum: ${curriculum.title}
**Topic:** ${curriculum.topic}
**Difficulty:** ${curriculum.metadata.difficulty}
**Total Hours:** ${curriculum.metadata.estimatedHours}
**Prerequisites:** ${curriculum.metadata.prerequisites.join(', ') || 'None specified'}

## Phases:
${curriculum.phases.map(phase => `
### Phase ${phase.number}: ${phase.title}
**Growth Stage:** ${phase.growthStage}
**Estimated Hours:** ${phase.estimatedHours}

**Objectives:**
${phase.objectives.map(obj => `- ${obj.description}`).join('\n')}

**Deliverables:**
${phase.deliverables.map(del => `- ${del.title}: ${del.description}`).join('\n')}

**Key Concepts:**
${phase.keyConcepts.map(kc => `- ${kc.term}: ${kc.definition}`).join('\n')}
`).join('\n')}

Please:
1. Use review_design to provide an overall technical assessment
2. Use evaluate_architecture for any phases with significant concerns
3. Use suggest_pattern for any phases that would benefit from specific design patterns

Focus on technical feasibility, proper sequencing, and architecture soundness.`;

    const response = await this.chat(prompt);

    // Collect all feedback from tool calls
    const allFeedback: AgentFeedback[] = [];
    let technicalScore = 7; // Default score

    if (response.toolCalls) {
      for (const toolCall of response.toolCalls) {
        if (toolCall.output) {
          const output = toolCall.output as { feedback?: AgentFeedback | AgentFeedback[]; feasibilityScore?: number; architectureScore?: number };

          if (output.feedback) {
            if (Array.isArray(output.feedback)) {
              allFeedback.push(...output.feedback);
            } else {
              allFeedback.push(output.feedback);
            }
          }

          if (output.feasibilityScore) {
            technicalScore = output.feasibilityScore;
          }
        }
      }
    }

    return {
      feedback: allFeedback,
      technicalScore,
      summary: response.content,
    };
  }
}

export function createCanopyAgent(apiKey: string, model?: string): CanopyAgent {
  return new CanopyAgent(apiKey, model);
}
