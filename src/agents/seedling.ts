/**
 * 🌿 Seedling - The Curriculum Architect Agent
 *
 * Seedling plants the seeds of learning by designing curricula.
 * Takes a topic and grows it into a structured learning path.
 */

import { BaseAgent } from './base';
import { AgentTool, Curriculum, Phase, GrowthStage } from '../types';
import { randomUUID } from 'crypto';

export class SeedlingAgent extends BaseAgent {
  readonly name = 'seedling' as const;
  readonly displayName = '🌿 Seedling (Curriculum Architect)';

  readonly systemPrompt = `You are Seedling, the Curriculum Architect agent in the GROOT learning system. Your name reflects your role - planting seeds of knowledge and helping them grow into structured learning paths.

## Your Personality
- Thoughtful and methodical, like a gardener planning a garden
- You think in terms of growth: seeds → sprouts → saplings → trees
- You use botanical metaphors naturally: "Let's plant the foundation", "This concept branches into..."
- You're enthusiastic about learning architecture and curriculum design

## Your Role
You design comprehensive, project-based learning curricula. You:
1. Take a broad topic and break it down into progressive phases
2. Define clear learning objectives for each phase
3. Create hands-on deliverables that build real skills
4. Sequence concepts from simple to complex (like growth stages)
5. Ensure each phase builds on the previous one

## Curriculum Design Principles

### 🌱 Progressive Complexity
- Start with foundations, build to advanced topics
- Each phase should be achievable but challenging
- Concepts should compound - later phases use earlier learnings

### 🎯 Hands-On Focus
- Every phase must have concrete deliverables
- Prefer building over reading
- Deliverables should be portfolio-worthy

### 📊 Clear Structure
A curriculum has:
- **Title**: What the learner will master
- **Description**: Why this matters and what they'll achieve
- **Phases**: 4-6 progressive learning phases
- **Metadata**: Duration, difficulty, prerequisites, target audience

Each Phase has:
- **Title & Number**: Clear naming (e.g., "Phase 1: Foundations")
- **Growth Stage**: Maps to learning progression (seed → forest)
- **Objectives**: 3-5 specific learning goals
- **Deliverables**: 2-4 concrete things to build
- **Key Concepts**: Important terms and definitions
- **Estimated Hours**: Realistic time commitment

### 🌳 Growth Stages Mapping
- **Seed** (🌰): Setup, preparation, first exposure
- **Sprout** (🌱): Basic concepts, simple implementations
- **Sapling** (🪴): Building on foundations, growing complexity
- **Tree** (🌳): Core competency, substantial projects
- **Flowering** (🌸): Creative application, advanced features
- **Seeding** (🌾): Teaching others, contributing back
- **Forest** (🌲🌳🌴): Mastery, production-ready systems

## Output Format
When generating a curriculum, use the generate_curriculum_structure tool to output properly formatted JSON. This ensures:
- Consistent structure
- Easy integration with BEADS
- Reliable markdown generation
- Progress tracking capability

## Examples of Good Deliverables
- ✅ "Build a working RAG pipeline with document ingestion"
- ✅ "Create an agent that can browse the web and summarize findings"
- ✅ "Implement a vector database with semantic search"
- ❌ "Read about embeddings" (too passive)
- ❌ "Understand transformers" (not concrete)

## Teaching Approach
- Break complex topics into learnable chunks
- Provide context for why each phase matters
- Build confidence through achievable milestones
- Celebrate growth at each stage

Remember: You're not just creating a reading list - you're designing a growth journey!`;

  readonly tools: AgentTool[] = [
    {
      name: 'generate_curriculum_structure',
      description: 'Generate a complete curriculum structure with phases, objectives, and deliverables in JSON format',
      inputSchema: {
        type: 'object' as const,
        properties: {
          title: {
            type: 'string',
            description: 'Curriculum title (what the learner will master)',
          },
          description: {
            type: 'string',
            description: 'Overview of what this curriculum teaches and why it matters',
          },
          topic: {
            type: 'string',
            description: 'The core topic/technology being taught',
          },
          difficulty: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced'],
            description: 'Overall difficulty level',
          },
          estimatedHours: {
            type: 'number',
            description: 'Total estimated hours to complete',
          },
          prerequisites: {
            type: 'array',
            items: { type: 'string' },
            description: 'Required knowledge before starting',
          },
          targetAudience: {
            type: 'string',
            description: 'Who this curriculum is designed for',
          },
          phases: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                number: { type: 'number' },
                title: { type: 'string' },
                description: { type: 'string' },
                growthStage: {
                  type: 'string',
                  enum: ['seed', 'sprout', 'sapling', 'tree', 'flowering', 'seeding', 'forest']
                },
                estimatedHours: { type: 'number' },
                objectives: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' }
                    }
                  }
                },
                deliverables: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      acceptanceCriteria: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    }
                  }
                },
                keyConcepts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      term: { type: 'string' },
                      definition: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        required: ['title', 'description', 'topic', 'phases'],
      },
      execute: async (input: unknown) => {
        const curriculumData = input as {
          title: string;
          description: string;
          topic: string;
          difficulty?: 'beginner' | 'intermediate' | 'advanced';
          estimatedHours?: number;
          prerequisites?: string[];
          targetAudience?: string;
          phases: Array<{
            number: number;
            title: string;
            description: string;
            growthStage: GrowthStage;
            estimatedHours: number;
            objectives: Array<{ description: string }>;
            deliverables: Array<{
              title: string;
              description: string;
              acceptanceCriteria: string[];
            }>;
            keyConcepts: Array<{
              term: string;
              definition: string;
            }>;
          }>;
        };

        // Transform input into full Curriculum object
        const curriculum: Curriculum = {
          id: randomUUID(),
          title: curriculumData.title,
          description: curriculumData.description,
          topic: curriculumData.topic,
          createdAt: new Date(),
          updatedAt: new Date(),
          currentPhaseIndex: 0,
          growthStage: 'seed',
          metadata: {
            estimatedHours: curriculumData.estimatedHours || 0,
            difficulty: curriculumData.difficulty || 'intermediate',
            prerequisites: curriculumData.prerequisites || [],
            tags: [],
            targetAudience: curriculumData.targetAudience || 'Technical professionals',
          },
          phases: curriculumData.phases.map((phase): Phase => ({
            id: randomUUID(),
            number: phase.number,
            title: phase.title,
            description: phase.description,
            growthStage: phase.growthStage,
            estimatedHours: phase.estimatedHours,
            status: phase.number === 1 ? 'available' : 'locked',
            objectives: phase.objectives.map(obj => ({
              id: randomUUID(),
              description: obj.description,
              completed: false,
            })),
            deliverables: phase.deliverables.map(del => ({
              id: randomUUID(),
              title: del.title,
              description: del.description,
              acceptanceCriteria: del.acceptanceCriteria,
              completed: false,
            })),
            keyConcepts: phase.keyConcepts,
          })),
        };

        return {
          success: true,
          curriculum,
          message: 'Curriculum structure generated successfully',
        };
      },
    },
  ];
}

export function createSeedlingAgent(apiKey: string, model?: string): SeedlingAgent {
  return new SeedlingAgent(apiKey, model);
}
