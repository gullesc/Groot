#!/usr/bin/env node

import 'dotenv/config';

/**
 * GROOT CLI
 * 
 * Command-line interface for the GROOT learning system.
 * 
 * Usage:
 *   groot plant <topic>     - Generate a curriculum
 *   groot ask <question>    - Ask the tutor
 *   groot status            - Show progress
 *   groot wake              - Start a session
 *   groot rest              - End a session
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  loadConfig,
  validateConfig,
  loadExtendedConfig,
  getConfigValue,
  generateGrootrcTemplate,
  generateUserConfigTemplate,
} from '../core/config';
import {
  getUserConfigPath,
  getProjectConfigPath,
  initUserGrootDir,
} from '../core/paths';
import { displayHookResults } from '../core/hooks';
import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { stringify as yamlStringify } from 'yaml';
import { join } from 'path';
import { isBeadsAvailable, isBeadsInitialized, getReadyWork, syncBeads, updateBeadsSessionProgress } from '../core/beads';
import { createBarkAgent } from '../agents/bark';
import { createOrchestrator, DebugEvent } from '../core/orchestrator';
import {
  saveJournalEntry,
  listJournalEntries,
  getJournalEntry,
  getJournalPath,
} from '../core/journal';
import {
  startSessionFromPath,
  setCurrentSession,
  listSessions,
  endSession,
  markObjectiveComplete,
  markDeliverableComplete,
  addSessionNote,
  generateHandoff,
  formatDuration,
  getSessionSummary,
  saveActiveSession,
  loadActiveSession,
  addQuestionAsked,
} from '../core/session';
import {
  loadCurriculumJSON,
  updateCurriculumProgress,
  getCurrentCurriculum,
  saveCurriculum,
} from '../core/curriculum-output';
import {
  isGrootInitialized,
  hasCurriculum,
  getCurriculumPath,
  initGrootDir,
} from '../core/paths';
import { Curriculum, AgentFeedback, Session } from '../types';
import { input, select, checkbox, confirm } from '@inquirer/prompts';
import {
  scaffoldPhase,
  getAvailableTemplateTypes,
  getTemplate,
} from '../core/scaffold';
import {
  runPhaseTests,
  detectProjectType,
} from '../core/test-runner';
import {
  solveDeliverable,
  solvePhase,
  specsExist,
  getPrompt,
  getPhasePrompt,
} from '../core/solver';
import {
  validatePhaseSpecs,
} from '../core/spec-validator';
import {
  generateSpecsForPhase,
} from '../core/spec-generator';
import {
  syncWithCurriculum,
  fullSyncWithCurriculum,
} from '../core/sync';
import {
  writeConstitution,
} from '../core/constitution-generator';
import { readFileSync } from 'fs';

// Get version from package.json (CommonJS has __dirname)
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8')) as { version: string };

const program = new Command();

// ASCII art logo
const LOGO = `
  🌳 G.R.O.O.T.
  Guided Resource for Organized Objective Training
`;

program
  .name('groot')
  .description('AI-powered learning curriculum generator')
  .version(packageJson.version);

// ============================================================================
// groot init - Initialize GROOT in current directory
// ============================================================================
program
  .command('init')
  .description('Initialize GROOT in the current directory')
  .action(async () => {
    console.log(LOGO);

    if (isGrootInitialized()) {
      console.log(chalk.yellow('GROOT is already initialized in this directory.'));
      if (hasCurriculum()) {
        const curriculum = await getCurrentCurriculum();
        if (curriculum) {
          console.log(chalk.cyan(`   Curriculum: ${curriculum.title}`));
          console.log(chalk.cyan(`   Phases: ${curriculum.phases.length}`));
        }
      } else {
        console.log(chalk.gray('   No curriculum yet. Create one with: groot plant "your topic"'));
      }
      return;
    }

    await initGrootDir();
    console.log(chalk.green('Initialized GROOT in current directory.'));
    console.log(chalk.gray('\n   Created: .groot/'));
    console.log(chalk.gray('            .groot/sessions/'));
    console.log(chalk.gray('            .groot/journal/'));
    console.log(chalk.cyan('\nNext steps:'));
    console.log(chalk.gray('   groot plant "your topic"  - Generate a curriculum'));
    console.log(chalk.gray('   groot wake                - Start a learning session'));
  });

// ============================================================================
// groot ask - Ask the tutor a question
// ============================================================================
program
  .command('ask <question...>')
  .description('Ask the Bark (Tutor) agent a question')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (questionParts: string[], options) => {
    const question = questionParts.join(' ');
    const config = loadConfig();
    const { valid, errors } = validateConfig(config);
    
    if (!valid) {
      console.error(chalk.red('Configuration error:'));
      errors.forEach(err => console.error(chalk.red(`  - ${err}`)));
      console.error(chalk.yellow('\nSet your API key: export ANTHROPIC_API_KEY=your-key'));
      process.exit(1);
    }

    console.log(chalk.green(`\n🪵 Bark is thinking...\n`));

    try {
      // Log question to active session if one exists
      const session = await loadActiveSession();
      if (session && session.status === 'active') {
        addQuestionAsked(session, question);
        await saveActiveSession(session);
      }

      const bark = createBarkAgent(config.anthropicApiKey!);
      const response = await bark.chat(question);

      console.log(chalk.cyan('─'.repeat(60)));
      console.log(response.content);
      console.log(chalk.cyan('─'.repeat(60)));

      if (options.verbose && response.toolCalls) {
        console.log(chalk.gray('\nTools used:'));
        response.toolCalls.forEach(tc => {
          console.log(chalk.gray(`  - ${tc.toolName}`));
        });
      }
    } catch (error) {
      console.error(chalk.red('Error communicating with Bark:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// groot status - Show current progress
// ============================================================================
program
  .command('status')
  .description('Show your current learning progress')
  .action(async () => {
    console.log(LOGO);

    // Check if GROOT is initialized
    if (!isGrootInitialized()) {
      console.log(chalk.yellow('GROOT is not initialized in this directory.'));
      console.log(chalk.gray('Run: groot init'));
      console.log();
      return;
    }

    // Show curriculum info
    if (hasCurriculum()) {
      const curriculum = await getCurrentCurriculum();
      if (curriculum) {
        console.log(chalk.green('📚 Curriculum: ' + curriculum.title));
        console.log(chalk.cyan('─'.repeat(50)));
        curriculum.phases.forEach(p => {
          const statusIcon =
            p.status === 'completed' ? '✓' :
            p.status === 'in_progress' ? '→' :
            p.status === 'available' ? '○' :
            '🔒';
          const statusColor =
            p.status === 'completed' ? chalk.green :
            p.status === 'in_progress' ? chalk.yellow :
            p.status === 'available' ? chalk.cyan :
            chalk.gray;
          console.log(statusColor(`   ${statusIcon} Phase ${p.number}: ${p.title}`));
        });
        console.log(chalk.cyan('─'.repeat(50)));
        console.log();
      }
    } else {
      console.log(chalk.gray('No curriculum yet.'));
      console.log(chalk.gray('Create one with: groot plant "your topic"\n'));
    }

    // Check for active session (from file)
    const session = await loadActiveSession();

    if (session && session.status === 'active') {
      const summary = getSessionSummary(session);
      console.log(chalk.green('📖 Active Session'));
      console.log(chalk.white(`   Phase: ${session.phaseNumber} - ${session.phaseTitle}`));
      console.log(chalk.white(`   Time: ${summary.duration}`));
      console.log(chalk.white(`   Progress: ${summary.objectivesCompleted} objectives, ${summary.deliverablesCompleted} deliverables`));
      if (summary.notes > 0) {
        console.log(chalk.gray(`   Notes: ${summary.notes}`));
      }
      console.log();
    } else if (hasCurriculum()) {
      console.log(chalk.gray('No active session. Start one with: groot wake\n'));
    }

    // Show recent sessions
    const recentSessions = await listSessions();
    const completedSessions = recentSessions.filter(s => s.status === 'completed').slice(0, 3);

    if (completedSessions.length > 0) {
      console.log(chalk.cyan('📋 Recent Sessions'));
      completedSessions.forEach(s => {
        const date = new Date(s.startedAt).toLocaleDateString();
        const duration = formatDuration(s.progress.timeSpentMinutes);
        console.log(chalk.gray(`   ${date} - ${s.curriculumTitle} Phase ${s.phaseNumber} (${duration})`));
      });
      console.log();
    }

    // Check BEADS status
    if (!isBeadsAvailable()) {
      console.log(chalk.yellow('⚠️  BEADS is not installed.'));
      console.log(chalk.gray('   Install: curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash'));
      console.log();
    } else if (!isBeadsInitialized()) {
      console.log(chalk.yellow('⚠️  BEADS is not initialized in this directory.'));
      console.log(chalk.gray('   Run: bd init'));
      console.log();
    } else {
      console.log(chalk.green('✅ BEADS is ready'));

      const readyWork = getReadyWork();
      if (readyWork.length > 0) {
        console.log(chalk.cyan(`\n📋 Ready to work on (${readyWork.length} items):`));
        readyWork.slice(0, 5).forEach(issue => {
          const priorityColor = issue.priority <= 1 ? chalk.red : chalk.white;
          console.log(priorityColor(`   [${issue.id}] ${issue.title}`));
        });
        if (readyWork.length > 5) {
          console.log(chalk.gray(`   ... and ${readyWork.length - 5} more`));
        }
      } else {
        console.log(chalk.gray('\n   No ready work items. Time to plant some seeds! 🌱'));
      }
    }

    // Show growth stage (placeholder)
    console.log(chalk.cyan('\n🌱 Growth Stage: Seed'));
    console.log(chalk.gray('   You are just beginning your journey.\n'));

    // Show available commands
    console.log(chalk.white('Available commands:'));
    console.log(chalk.gray('   groot plant <topic>  - Start a new curriculum'));
    console.log(chalk.gray('   groot ask <question> - Ask the tutor'));
    console.log(chalk.gray('   groot wake           - Start a learning session'));
    console.log(chalk.gray('   groot rest           - End your session'));
  });

// ============================================================================
// Interactive curriculum preferences
// ============================================================================
interface CurriculumPreferences {
  experienceLevel: string;
  learningGoal: string;
  weeklyHours: string;
  preferredLanguage: string;
  focusAreas: string[];
}

async function gatherCurriculumPreferences(topic: string): Promise<CurriculumPreferences> {
  console.log(chalk.cyan('\n🌿 Let me learn about your goals to personalize your curriculum.\n'));

  const experienceLevel = await select({
    message: `What's your experience level with "${topic}"?`,
    choices: [
      { value: 'beginner', name: 'Beginner - New to this topic' },
      { value: 'some', name: 'Some Experience - Familiar with basics' },
      { value: 'intermediate', name: 'Intermediate - Have built small projects' },
      { value: 'advanced', name: 'Advanced - Want to deepen expertise' },
    ],
  });

  const learningGoal = await select({
    message: 'What is your primary learning goal?',
    choices: [
      { value: 'career', name: 'Career - Job skills or career change' },
      { value: 'project', name: 'Project - Build something specific' },
      { value: 'hobby', name: 'Hobby - Personal interest and fun' },
      { value: 'academic', name: 'Academic - School or certification' },
    ],
  });

  const weeklyHours = await select({
    message: 'How many hours per week can you dedicate?',
    choices: [
      { value: '2-5', name: '2-5 hours (casual pace)' },
      { value: '5-10', name: '5-10 hours (steady progress)' },
      { value: '10-20', name: '10-20 hours (intensive learning)' },
      { value: '20+', name: '20+ hours (full immersion)' },
    ],
  });

  const preferredLanguage = await select({
    message: 'Preferred programming language/framework?',
    choices: [
      { value: 'python', name: 'Python' },
      { value: 'typescript', name: 'TypeScript/JavaScript' },
      { value: 'any', name: 'No preference / Best for the topic' },
      { value: 'other', name: 'Other (will be considered)' },
    ],
  });

  const focusAreas = await checkbox({
    message: 'Any specific areas to focus on? (optional)',
    choices: [
      { value: 'hands-on', name: 'Hands-on projects over theory' },
      { value: 'theory', name: 'Strong theoretical foundation' },
      { value: 'best-practices', name: 'Industry best practices' },
      { value: 'portfolio', name: 'Portfolio-worthy projects' },
      { value: 'interview', name: 'Interview preparation' },
    ],
  });

  return {
    experienceLevel,
    learningGoal,
    weeklyHours,
    preferredLanguage,
    focusAreas,
  };
}

function buildPersonalizedPrompt(topic: string, prefs: CurriculumPreferences): string {
  const focusText = prefs.focusAreas.length > 0
    ? `Focus areas: ${prefs.focusAreas.join(', ')}.`
    : '';

  return `Generate a comprehensive, project-based learning curriculum for: "${topic}"

LEARNER PROFILE:
- Experience Level: ${prefs.experienceLevel}
- Learning Goal: ${prefs.learningGoal}
- Weekly Time Commitment: ${prefs.weeklyHours} hours
- Preferred Language: ${prefs.preferredLanguage}
${focusText}

IMPORTANT: You must call the generate_curriculum_structure tool with ALL fields including the complete phases array.

Tailor the curriculum to this learner's profile:
- Adjust difficulty and pacing based on their experience level (${prefs.experienceLevel})
- Align deliverables with their goal (${prefs.learningGoal})
- Size phases to fit ${prefs.weeklyHours} hours/week commitment
- Use ${prefs.preferredLanguage === 'any' ? 'the best language for the topic' : prefs.preferredLanguage} where applicable
${prefs.focusAreas.includes('hands-on') ? '- Emphasize hands-on projects over theory' : ''}
${prefs.focusAreas.includes('theory') ? '- Include strong theoretical foundations' : ''}
${prefs.focusAreas.includes('best-practices') ? '- Incorporate industry best practices' : ''}
${prefs.focusAreas.includes('portfolio') ? '- Make deliverables portfolio-worthy' : ''}
${prefs.focusAreas.includes('interview') ? '- Include interview-relevant concepts' : ''}

Create a curriculum with:
- title, description, topic, difficulty, estimatedHours, prerequisites, targetAudience
- phases: An array of 4-6 progressive learning phases. EACH phase must include:
  - number (1, 2, 3, etc.)
  - title (e.g., "Foundations & Setup")
  - description
  - growthStage (one of: seed, sprout, sapling, tree, flowering, seeding, forest)
  - estimatedHours
  - objectives: Array of objects with "description" field
  - deliverables: Array of objects with "title", "description", and "acceptanceCriteria" (array of strings)
  - keyConcepts: Array of objects with "term" and "definition" fields

Call the generate_curriculum_structure tool NOW with the complete curriculum including all phases.`;
}

// ============================================================================
// groot plant - Generate a curriculum
// ============================================================================
program
  .command('plant <topic...>')
  .description('Plant a seed - generate a new learning curriculum')
  .option('-i, --interactive', 'Ask clarifying questions to personalize the curriculum')
  .option('--markdown <file>', 'Also output as markdown file')
  .option('--beads', 'Create BEADS epics and tasks from curriculum')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (topicParts: string[], options) => {
    const topic = topicParts.join(' ');
    const config = loadConfig();
    const { valid, errors } = validateConfig(config);

    if (!valid) {
      console.error(chalk.red('Configuration error:'));
      errors.forEach(err => console.error(chalk.red(`  - ${err}`)));
      console.error(chalk.yellow('\nSet your API key: export ANTHROPIC_API_KEY=your-key'));
      process.exit(1);
    }

    // Check if curriculum already exists
    if (hasCurriculum()) {
      const overwrite = await confirm({
        message: 'A curriculum already exists in this project. Overwrite it?',
        default: false,
      });
      if (!overwrite) {
        console.log(chalk.gray('Cancelled.'));
        return;
      }
    }

    console.log(LOGO);

    try {
      // Initialize .groot directory
      await initGrootDir();

      // Gather preferences if interactive mode
      let prompt: string;
      if (options.interactive) {
        const prefs = await gatherCurriculumPreferences(topic);
        console.log(chalk.green(`\n🌿 Seedling is designing your personalized curriculum...\n`));
        console.log(chalk.gray(`Topic: ${topic}`));
        console.log(chalk.gray(`Profile: ${prefs.experienceLevel} | ${prefs.learningGoal} | ${prefs.weeklyHours}h/week`));
        console.log();
        prompt = buildPersonalizedPrompt(topic, prefs);
      } else {
        console.log(chalk.green(`🌿 Seedling is designing your curriculum...\n`));
        console.log(chalk.gray(`Topic: ${topic}`));
        console.log(chalk.gray(`Tip: Use --interactive for a personalized curriculum`));
        console.log();
        prompt = `Generate a comprehensive, project-based learning curriculum for: "${topic}"

IMPORTANT: You must call the generate_curriculum_structure tool with ALL fields including the complete phases array.

Create a curriculum with:
- title, description, topic, difficulty, estimatedHours, prerequisites, targetAudience
- phases: An array of 4-6 progressive learning phases. EACH phase must include:
  - number (1, 2, 3, etc.)
  - title (e.g., "Foundations & Setup")
  - description
  - growthStage (one of: seed, sprout, sapling, tree, flowering, seeding, forest)
  - estimatedHours
  - objectives: Array of objects with "description" field
  - deliverables: Array of objects with "title", "description", and "acceptanceCriteria" (array of strings)
  - keyConcepts: Array of objects with "term" and "definition" fields

Call the generate_curriculum_structure tool NOW with the complete curriculum including all phases.`;
      }

      const { createSeedlingAgent } = await import('../agents/seedling');
      const seedling = createSeedlingAgent(config.anthropicApiKey!);

      // Show spinner while generating curriculum
      const spinner = ora({
        text: 'Designing curriculum structure...',
        spinner: 'dots',
      }).start();

      let response;
      try {
        response = await seedling.chat(prompt);
        spinner.succeed('Curriculum generated!');
      } catch (error) {
        spinner.fail('Failed to generate curriculum');
        throw error;
      }

      // Extract curriculum from tool call
      if (response.toolCalls && response.toolCalls.length > 0) {
        const curriculumTool = response.toolCalls.find(tc => tc.toolName === 'generate_curriculum_structure');
        if (curriculumTool && curriculumTool.output) {
          const output = curriculumTool.output as { success: boolean; curriculum?: Curriculum; error?: string };

          // Check for tool errors
          if (!output.success || !output.curriculum) {
            console.error(chalk.red('Failed to generate curriculum:'));
            console.error(chalk.red(`  ${output.error || 'Unknown error'}`));
            process.exit(1);
          }

          let { curriculum } = output;

          // Create BEADS issues if requested
          if (options.beads) {
            if (!isBeadsAvailable() || !isBeadsInitialized()) {
              console.log(chalk.yellow('\n⚠️  BEADS is not available or initialized.'));
              console.log(chalk.gray('   Skipping BEADS integration.'));
            } else {
              console.log(chalk.cyan('\n📋 Creating BEADS epics and tasks...'));
              const { createBeadsFromCurriculum, linkCurriculumToBeads } = await import('../core/curriculum-beads');
              const beadsIds = createBeadsFromCurriculum(curriculum);
              curriculum = linkCurriculumToBeads(curriculum, beadsIds);
              console.log(chalk.green(`✅ Created ${curriculum.phases.length} phase epics with tasks`));
            }
          }

          // Save curriculum to .groot/curriculum.json
          const filePath = await saveCurriculum(curriculum);
          console.log(chalk.green(`\n✅ Curriculum saved to ${filePath}`));

          // Also output markdown if requested
          if (options.markdown) {
            const { writeCurriculumMarkdown } = await import('../core/curriculum-output');
            await writeCurriculumMarkdown(curriculum, options.markdown);
            console.log(chalk.green(`📄 Markdown saved to ${options.markdown}`));
          }

          console.log(chalk.cyan('\nNext steps:'));
          console.log(chalk.gray('  1. Review the curriculum'));
          console.log(chalk.gray('  2. Use "groot wake" to start a learning session'));
          console.log(chalk.gray('  3. Use "groot ask" to learn about concepts'));
          if (options.beads) {
            console.log(chalk.gray('  4. Run "bd ready" to see ready work in BEADS'));
          }
        } else {
          console.error(chalk.red('Failed to generate curriculum structure'));
          process.exit(1);
        }
      } else {
        console.error(chalk.red('No curriculum was generated'));
        if (options.verbose) {
          console.log(chalk.gray('\nResponse:'));
          console.log(response.content);
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error generating curriculum:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// groot wake - Start a learning session
// ============================================================================
program
  .command('wake')
  .description('Wake up - start a new learning session')
  .option('-p, --phase <number>', 'Phase number to start')
  .action(async (options) => {
    console.log(LOGO);
    console.log(chalk.green(`\n🌅 GROOT - Wake Up and Learn!\n`));

    try {
      // Check if GROOT is initialized
      if (!isGrootInitialized() || !hasCurriculum()) {
        console.log(chalk.yellow('No curriculum found in this project.'));
        console.log(chalk.gray('Generate one with: groot plant "your topic"'));
        return;
      }

      // Check for existing active session (file-based persistence)
      const existingSession = await loadActiveSession();
      if (existingSession && existingSession.status === 'active') {
        const summary = getSessionSummary(existingSession);
        console.log(chalk.yellow('⚠️  Active session found:'));
        console.log(chalk.white(`   Curriculum: ${existingSession.curriculumTitle}`));
        console.log(chalk.white(`   Phase: ${existingSession.phaseNumber} - ${existingSession.phaseTitle}`));
        console.log(chalk.white(`   Duration: ${summary.duration}`));
        console.log();

        const resumeChoice = await select({
          message: 'What would you like to do?',
          choices: [
            { name: 'Resume existing session', value: 'resume' },
            { name: 'End current session and start new', value: 'end' },
            { name: 'Cancel', value: 'cancel' },
          ],
        });

        if (resumeChoice === 'cancel') {
          return;
        }

        if (resumeChoice === 'resume') {
          setCurrentSession(existingSession);
          await displaySessionInfo(existingSession);
          return;
        }

        // End existing session before starting new
        if (resumeChoice === 'end') {
          console.log(chalk.gray('\nEnding previous session...'));
          const curriculum = await loadCurriculumJSON(existingSession.curriculumPath);
          const phase = curriculum.phases.find(p => p.number === existingSession.phaseNumber);
          if (phase) {
            const handoff = generateHandoff(existingSession, phase);
            await endSession(existingSession, handoff);
            console.log(chalk.green('Previous session ended.\n'));
          }
        }
      }

      // Load curriculum from .groot/curriculum.json
      const curriculumPath = getCurriculumPath();
      const curriculum = await loadCurriculumJSON(curriculumPath);
      let selectedPhase: number;

      // Show curriculum info
      console.log(chalk.cyan(`📚 Curriculum: ${curriculum.title}\n`));
      curriculum.phases.forEach(p => {
        const statusColor =
          p.status === 'completed' ? chalk.green :
          p.status === 'in_progress' ? chalk.yellow :
          p.status === 'available' ? chalk.cyan :
          chalk.gray;
        const statusIcon =
          p.status === 'completed' ? '✓' :
          p.status === 'in_progress' ? '→' :
          p.status === 'available' ? '○' :
          '🔒';
        console.log(statusColor(`   ${statusIcon} Phase ${p.number}: ${p.title}`));
      });
      console.log();

      // Select phase
      if (options.phase) {
        selectedPhase = parseInt(options.phase, 10);
        const phase = curriculum.phases.find(p => p.number === selectedPhase);
        if (!phase) {
          console.error(chalk.red(`Phase ${selectedPhase} not found in curriculum`));
          return;
        }
        if (phase.status === 'locked') {
          console.error(chalk.red(`Phase ${selectedPhase} is locked. Complete previous phases first.`));
          return;
        }
      } else {
        // Interactive phase selection
        console.log();
        const phaseChoices = curriculum.phases.map(p => {
          const statusIcon =
            p.status === 'completed' ? '✓' :
            p.status === 'in_progress' ? '→' :
            p.status === 'available' ? '○' :
            '🔒';
          return {
            name: `${statusIcon} Phase ${p.number}: ${p.title} (${p.status})`,
            value: p.number,
            disabled: p.status === 'locked' ? 'Complete previous phases first' : false,
          };
        });

        selectedPhase = await select({
          message: 'Select a phase:',
          choices: phaseChoices,
        });
      }

      // Start the session
      console.log(chalk.cyan('\n🌅 Starting learning session...\n'));

      const session = await startSessionFromPath(curriculumPath, curriculum, selectedPhase);

      // Persist active session to file
      await saveActiveSession(session);

      await displaySessionInfo(session);

    } catch (error) {
      console.error(chalk.red('Error starting session:'), error);
      process.exit(1);
    }
  });

/**
 * Display session info with objectives and deliverables
 */
async function displaySessionInfo(session: Session): Promise<void> {
  const curriculum = await loadCurriculumJSON(session.curriculumPath);
  const phase = curriculum.phases.find(p => p.number === session.phaseNumber);

  if (!phase) {
    console.error(chalk.red('Phase not found in curriculum'));
    return;
  }

  console.log(chalk.cyan('─'.repeat(60)));
  console.log(chalk.white(`   Curriculum: ${session.curriculumTitle}`));
  console.log(chalk.white(`   Phase: ${session.phaseNumber} - ${session.phaseTitle}`));
  console.log(chalk.white(`   Started: ${new Date(session.startedAt).toLocaleTimeString()}`));
  console.log(chalk.cyan('─'.repeat(60)));
  console.log();

  // Show objectives
  console.log(chalk.cyan('   📋 Objectives:'));
  phase.objectives.forEach(obj => {
    const completed = session.progress.objectivesCompleted.includes(obj.id) || obj.completed;
    const icon = completed ? chalk.green('✓') : chalk.gray('○');
    const text = completed ? chalk.green(obj.description) : chalk.white(obj.description);
    console.log(`   ${icon} ${text}`);
  });
  console.log();

  // Show deliverables
  console.log(chalk.cyan('   📦 Deliverables:'));
  phase.deliverables.forEach(del => {
    const completed = session.progress.deliverablesCompleted.includes(del.id) || del.completed;
    const icon = completed ? chalk.green('✓') : chalk.gray('○');
    const text = completed ? chalk.green(del.title) : chalk.white(del.title);
    console.log(`   ${icon} ${text}`);
  });
  console.log();

  // Show BEADS ready work if available
  if (isBeadsAvailable() && isBeadsInitialized()) {
    const readyWork = getReadyWork();
    if (readyWork.length > 0) {
      console.log(chalk.cyan('   🔧 Ready Work (BEADS):'));
      readyWork.slice(0, 3).forEach(issue => {
        console.log(chalk.white(`   [${issue.id}] ${issue.title}`));
      });
      if (readyWork.length > 3) {
        console.log(chalk.gray(`   ... and ${readyWork.length - 3} more`));
      }
      console.log();
    }
  }

  console.log(chalk.gray(`   💡 Tip: Use 'groot ask' to ask questions`));
  console.log(chalk.gray(`           Use 'groot rest' when done`));
}

// ============================================================================
// groot rest - End a learning session
// ============================================================================
program
  .command('rest')
  .description('Rest - end your learning session and save progress')
  .option('-n, --notes <notes>', 'Add session notes')
  .option('-q, --quick', 'Quick rest - skip interactive prompts')
  .action(async (options) => {
    console.log(LOGO);
    console.log(chalk.blue(`\n🌙 GROOT - Time to Rest\n`));

    try {
      // Find active session (from file)
      const session = await loadActiveSession();

      if (!session || session.status !== 'active') {
        console.log(chalk.yellow('No active session found.'));
        console.log(chalk.gray('Start one with: groot wake'));
        return;
      }

      // Load curriculum and phase
      const curriculum = await loadCurriculumJSON(session.curriculumPath);
      const phase = curriculum.phases.find(p => p.number === session!.phaseNumber);

      if (!phase) {
        console.error(chalk.red('Phase not found in curriculum'));
        return;
      }

      // Calculate duration
      const startTime = new Date(session.startedAt).getTime();
      const now = Date.now();
      const durationMinutes = Math.round((now - startTime) / (1000 * 60));
      const durationStr = formatDuration(durationMinutes);

      console.log(chalk.cyan(`Session Duration: ${durationStr}\n`));

      if (!options.quick) {
        // Interactive: Mark completed objectives
        const objectiveChoices = phase.objectives.map(obj => ({
          name: obj.description,
          value: obj.id,
          checked: session!.progress.objectivesCompleted.includes(obj.id) || obj.completed,
        }));

        if (objectiveChoices.length > 0) {
          const completedObjectives = await checkbox({
            message: 'Mark completed objectives:',
            choices: objectiveChoices,
          });

          // Update session progress
          completedObjectives.forEach(objId => {
            markObjectiveComplete(session!, objId);
          });
        }

        // Interactive: Mark completed deliverables
        const deliverableChoices = phase.deliverables.map(del => ({
          name: del.title,
          value: del.id,
          checked: session!.progress.deliverablesCompleted.includes(del.id) || del.completed,
        }));

        if (deliverableChoices.length > 0) {
          const completedDeliverables = await checkbox({
            message: 'Mark completed deliverables:',
            choices: deliverableChoices,
          });

          // Update session progress
          completedDeliverables.forEach(delId => {
            markDeliverableComplete(session!, delId);
          });
        }

        // Add session notes
        const addNotes = await confirm({
          message: 'Add session notes?',
          default: false,
        });

        if (addNotes) {
          const notes = await input({
            message: 'Enter notes:',
          });
          if (notes.trim()) {
            addSessionNote(session, notes.trim());
          }
        }
      } else {
        // Quick mode: just add notes if provided
        if (options.notes) {
          addSessionNote(session, options.notes);
        }
      }

      // Generate handoff
      console.log(chalk.cyan('\n📝 Generating handoff...\n'));

      const handoff = generateHandoff(session, phase, session.notes.join('; '));

      // End and save session
      const filePath = await endSession(session, handoff);

      // Update curriculum progress
      await updateCurriculumProgress(
        session.curriculumPath,
        session.phaseNumber,
        session.progress.objectivesCompleted,
        session.progress.deliverablesCompleted
      );

      // Display summary
      console.log(chalk.green('   ✅ Session Complete!\n'));

      const objTotal = phase.objectives.length;
      const objCompleted = session.progress.objectivesCompleted.length;
      const delTotal = phase.deliverables.length;
      const delCompleted = session.progress.deliverablesCompleted.length;

      console.log(chalk.white(`   Summary: ${objCompleted}/${objTotal} objectives, ${delCompleted}/${delTotal} deliverables`));
      console.log(chalk.white(`   Time: ${durationStr}`));
      console.log();

      // Display handoff
      console.log(chalk.cyan('   📋 Handoff for Next Session:'));
      console.log(chalk.cyan('   ' + '─'.repeat(40)));

      if (handoff.completedWork.length > 0) {
        console.log(chalk.white('   Completed:'));
        handoff.completedWork.forEach(work => {
          console.log(chalk.green(`   • ${work}`));
        });
      }

      if (handoff.remainingWork.length > 0) {
        console.log(chalk.white('\n   Remaining:'));
        handoff.remainingWork.forEach(work => {
          console.log(chalk.yellow(`   • ${work}`));
        });
      }

      if (handoff.nextSteps.length > 0) {
        console.log(chalk.white('\n   Next Steps:'));
        handoff.nextSteps.forEach(step => {
          console.log(chalk.cyan(`   • ${step}`));
        });
      }

      console.log(chalk.cyan('   ' + '─'.repeat(40)));
      console.log();

      console.log(chalk.gray(`   💾 Session saved to: ${filePath}`));

      // BEADS sync if available
      if (isBeadsAvailable() && isBeadsInitialized()) {
        try {
          // Update BEADS with session progress
          const deliverableBeadsIds = phase.deliverables
            .filter(d => session!.progress.deliverablesCompleted.includes(d.id) && d.beadsTaskId)
            .map(d => d.beadsTaskId!);

          updateBeadsSessionProgress(
            deliverableBeadsIds,
            phase.beadsEpicId,
            handoff.summary
          );

          syncBeads();
          console.log(chalk.gray('   🔄 BEADS synced'));
        } catch {
          // Ignore BEADS sync errors
        }
      }
    } catch (error) {
      console.error(chalk.red('Error ending session:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// groot grow - Multi-agent collaboration
// ============================================================================
program
  .command('grow [topic...]')
  .description('Grow - generate and review curriculum with multi-agent collaboration')
  .option('-f, --file <file>', 'Review existing curriculum from .groot/curriculum.json')
  .option('--markdown <file>', 'Also output as markdown file')
  .option('--beads', 'Create BEADS epics and tasks from curriculum')
  .option('-v, --verbose', 'Show detailed output')
  .option('--debug', 'Show full agent interaction details')
  .action(async (topicParts: string[], options) => {
    const config = loadConfig();
    const { valid, errors } = validateConfig(config);

    if (!valid) {
      console.error(chalk.red('Configuration error:'));
      errors.forEach(err => console.error(chalk.red(`  - ${err}`)));
      console.error(chalk.yellow('\nSet your API key: export ANTHROPIC_API_KEY=your-key'));
      process.exit(1);
    }

    // Determine if we're generating new or reviewing existing
    const fromFile = !!options.file;
    const topic = fromFile ? options.file : topicParts.join(' ');

    if (!topic) {
      console.error(chalk.red('Please provide a topic or --file option'));
      console.error(chalk.gray('Usage: groot grow "Building REST APIs"'));
      console.error(chalk.gray('       groot grow --file curriculum.json'));
      process.exit(1);
    }

    console.log(LOGO);
    console.log(chalk.cyan('Multi-Agent Curriculum Review\n'));

    // Track feedback for display
    const allFeedback: AgentFeedback[] = [];

    // Helper to format debug output
    const formatDebugEvent = (event: DebugEvent): void => {
      const agentColors: Record<string, typeof chalk.green> = {
        seedling: chalk.green,
        canopy: chalk.blue,
        bark: chalk.yellow,
        orchestrator: chalk.magenta,
      };
      const color = agentColors[event.agent] || chalk.white;
      const agentLabel = color(`[${event.agent.toUpperCase()}]`);

      switch (event.type) {
        case 'prompt':
          console.log(chalk.cyan(`\n   ${agentLabel} PROMPT:`));
          console.log(chalk.gray(`   ${event.content.substring(0, 200)}${event.content.length > 200 ? '...' : ''}`));
          break;
        case 'response':
          console.log(chalk.cyan(`   ${agentLabel} RESPONSE:`));
          console.log(chalk.gray(`   ${event.content.substring(0, 300)}${event.content.length > 300 ? '...' : ''}`));
          if (event.data) {
            console.log(chalk.gray(`   Data: ${JSON.stringify(event.data)}`));
          }
          break;
        case 'tool_call':
          console.log(chalk.cyan(`   ${agentLabel} TOOL CALL: ${event.content}`));
          if (event.data && options.debug) {
            const dataStr = JSON.stringify(event.data, null, 2);
            const lines = dataStr.split('\n').slice(0, 10);
            lines.forEach(line => console.log(chalk.gray(`     ${line}`)));
            if (dataStr.split('\n').length > 10) {
              console.log(chalk.gray('     ... (truncated)'));
            }
          }
          break;
        case 'tool_result':
          console.log(chalk.cyan(`   ${agentLabel} TOOL RESULT: ${event.content}`));
          break;
        case 'handoff':
          console.log(chalk.magenta(`\n   ${agentLabel} HANDOFF: ${event.content}`));
          if (event.data) {
            console.log(chalk.gray(`   ${JSON.stringify(event.data)}`));
          }
          break;
      }
    };

    // Create orchestrator with callbacks for progress display
    const orchestrator = createOrchestrator(
      { apiKey: config.anthropicApiKey!, verbose: options.verbose, debug: options.debug },
      {
        onPhaseStart: (phase: string) => {
          const phaseNames: Record<string, string> = {
            generate: '🌿 Seedling is generating curriculum...',
            'technical-review': '🌲 Canopy is reviewing technical feasibility...',
            'pedagogical-review': '🪵 Bark is reviewing pedagogical soundness...',
            merge: '📋 Merging feedback...',
          };
          console.log(chalk.green(phaseNames[phase] || `Starting ${phase}...`));
        },
        onPhaseComplete: (phase: string, success: boolean) => {
          if (success && options.verbose) {
            console.log(chalk.gray(`   ✓ ${phase} complete`));
          }
        },
        onFeedback: (feedback: AgentFeedback) => {
          allFeedback.push(feedback);
          if (!options.debug) {
            const icon =
              feedback.feedbackType === 'blocker'
                ? '🛑'
                : feedback.feedbackType === 'concern'
                ? '⚠️ '
                : feedback.feedbackType === 'suggestion'
                ? '💡'
                : '✅';
            const severityColor =
              feedback.severity === 'critical'
                ? chalk.red
                : feedback.severity === 'high'
                ? chalk.yellow
                : chalk.gray;
            console.log(severityColor(`   ${icon} ${feedback.message}`));
          }
        },
        onLog: (message: string) => {
          if (options.verbose) {
            console.log(chalk.gray(`   ${message}`));
          }
        },
        onDebug: (event: DebugEvent) => {
          if (options.debug) {
            formatDebugEvent(event);
          }
        },
      }
    );

    try {
      const result = await orchestrator.orchestrateGrow(topic, { fromFile });

      // Display summary
      console.log();
      if (result.success) {
        console.log(chalk.green('✅ Curriculum review complete'));
      } else {
        console.log(chalk.yellow('⚠️  Review complete with unresolved issues'));
      }

      // Show applied changes
      if (result.appliedChanges.length > 0) {
        console.log(chalk.cyan(`\nApplied ${result.appliedChanges.length} changes:`));
        result.appliedChanges.slice(0, 5).forEach(change => {
          console.log(chalk.gray(`   • ${change}`));
        });
        if (result.appliedChanges.length > 5) {
          console.log(chalk.gray(`   ... and ${result.appliedChanges.length - 5} more`));
        }
      }

      // Show unresolved issues
      if (result.unresolvedIssues.length > 0) {
        console.log(chalk.yellow(`\n${result.unresolvedIssues.length} unresolved issues:`));
        result.unresolvedIssues.forEach(issue => {
          console.log(chalk.yellow(`   🚩 ${issue.message}`));
          if (issue.suggestedChange) {
            console.log(chalk.gray(`      Fix: ${issue.suggestedChange}`));
          }
        });
      }

      // Create BEADS issues if requested
      if (options.beads) {
        if (!isBeadsAvailable() || !isBeadsInitialized()) {
          console.log(chalk.yellow('\n⚠️  BEADS is not available or initialized.'));
          console.log(chalk.gray('   Skipping BEADS integration.'));
        } else {
          console.log(chalk.cyan('\n📋 Creating BEADS epics and tasks...'));
          const { createBeadsFromCurriculum, linkCurriculumToBeads } = await import(
            '../core/curriculum-beads'
          );
          const beadsIds = createBeadsFromCurriculum(result.finalCurriculum);
          result.finalCurriculum = linkCurriculumToBeads(result.finalCurriculum, beadsIds);
          console.log(
            chalk.green(`✅ Created ${result.finalCurriculum.phases.length} phase epics with tasks`)
          );
        }
      }

      // Initialize .groot and save curriculum
      await initGrootDir();
      const filePath = await saveCurriculum(result.finalCurriculum);
      console.log(chalk.green(`\n✅ Curriculum saved to ${filePath}`));

      // Also output markdown if requested
      if (options.markdown) {
        const { writeCurriculumMarkdown } = await import('../core/curriculum-output');
        await writeCurriculumMarkdown(result.finalCurriculum, options.markdown);
        console.log(chalk.green(`📄 Markdown saved to ${options.markdown}`));
      }

      // Next steps
      console.log(chalk.cyan('\nNext steps:'));
      console.log(chalk.gray('  1. Review the curriculum'));
      console.log(chalk.gray('  2. Use "groot wake" to start a learning session'));
      console.log(chalk.gray('  3. Use "groot ask" to learn about concepts'));
      if (options.beads) {
        console.log(chalk.gray('  4. Run "bd ready" to see ready work in BEADS'));
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Error during orchestration:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// groot remember - Learning journal
// ============================================================================
program
  .command('remember [title...]')
  .description('Remember - capture learning explanations as journal entries')
  .option('-l, --list', 'List all journal entries')
  .option('-v, --view <slug>', 'View a specific journal entry')
  .option('-c, --content <content>', 'Content to save (if not provided, opens editor prompt)')
  .option('--phase <phase>', 'Context: current phase name')
  .option('--activity <activity>', 'Context: current activity')
  .option('--curriculum <id>', 'Context: curriculum ID')
  .action(async (titleParts: string[], options) => {
    console.log(LOGO);

    // List entries
    if (options.list) {
      const entries = listJournalEntries();

      if (entries.length === 0) {
        console.log(chalk.gray('No journal entries yet.'));
        console.log(chalk.gray('\nCreate one with: groot remember "My first insight"'));
        return;
      }

      console.log(chalk.cyan('📓 Learning Journal Entries\n'));
      entries.forEach(entry => {
        console.log(chalk.white(`  ${entry.date}  ${entry.title}`));
        console.log(chalk.gray(`             slug: ${entry.slug}`));
      });
      console.log(chalk.gray(`\n${entries.length} entries total`));
      console.log(chalk.gray(`\nView an entry: groot remember --view <slug>`));
      return;
    }

    // View specific entry
    if (options.view) {
      const entry = getJournalEntry(options.view);

      if (!entry) {
        console.error(chalk.red(`Entry not found: ${options.view}`));
        console.log(chalk.gray('\nUse "groot remember --list" to see available entries'));
        process.exit(1);
      }

      console.log(chalk.cyan(`📓 ${entry.title}\n`));
      const dateStr = entry.capturedAt instanceof Date && !isNaN(entry.capturedAt.getTime())
        ? entry.capturedAt.toLocaleDateString()
        : 'Unknown date';
      console.log(chalk.gray(`Captured: ${dateStr}`));

      if (entry.context) {
        if (entry.context.phase) console.log(chalk.gray(`Phase: ${entry.context.phase}`));
        if (entry.context.activity) console.log(chalk.gray(`Activity: ${entry.context.activity}`));
      }

      console.log(chalk.cyan('\n─'.repeat(60) + '\n'));
      console.log(entry.content);

      if (entry.takeaways && entry.takeaways.length > 0) {
        console.log(chalk.cyan('\n📌 Key Takeaways:'));
        entry.takeaways.forEach(t => console.log(chalk.white(`  • ${t}`)));
      }

      if (entry.relatedTopics && entry.relatedTopics.length > 0) {
        console.log(chalk.gray('\nRelated Topics:'));
        entry.relatedTopics.forEach(t => console.log(chalk.gray(`  • ${t}`)));
      }

      return;
    }

    // Create new entry
    const title = titleParts.join(' ');

    if (!title) {
      console.error(chalk.red('Please provide a title for the journal entry'));
      console.error(chalk.gray('Usage: groot remember "How the Orchestrator works"'));
      console.error(chalk.gray('       groot remember --list'));
      console.error(chalk.gray('       groot remember --view <slug>'));
      process.exit(1);
    }

    // Get content
    let content = options.content;

    if (!content) {
      // Prompt for content
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log(chalk.cyan(`📝 Creating journal entry: "${title}"\n`));
      console.log(chalk.gray('Enter your content (end with an empty line):'));

      const lines: string[] = [];
      let emptyLineCount = 0;

      content = await new Promise<string>(resolve => {
        const promptLine = () => {
          rl.question('', line => {
            if (line === '') {
              emptyLineCount++;
              if (emptyLineCount >= 2) {
                rl.close();
                resolve(lines.join('\n'));
                return;
              }
              lines.push(''); // Keep single empty lines
            } else {
              emptyLineCount = 0;
              lines.push(line);
            }
            promptLine();
          });
        };
        promptLine();
      });
    }

    if (!content || content.trim() === '') {
      console.error(chalk.red('No content provided. Entry not created.'));
      process.exit(1);
    }

    // Build context
    const context =
      options.phase || options.activity || options.curriculum
        ? {
            phase: options.phase,
            activity: options.activity,
            curriculumId: options.curriculum,
          }
        : undefined;

    // Save entry
    const entry = saveJournalEntry(title, content, context);

    // Also add note to active session if one exists
    const session = await loadActiveSession();
    if (session && session.status === 'active') {
      addSessionNote(session, `Journal: ${title}`);
      await saveActiveSession(session);
    }

    console.log(chalk.green('\n📓 Learning Journal Entry Created'));
    console.log(chalk.gray(`   File: ${getJournalPath()}/${new Date().toISOString().split('T')[0]}-${entry.slug}.md`));
    if (context) {
      if (context.phase) console.log(chalk.gray(`   Phase: ${context.phase}`));
      if (context.activity) console.log(chalk.gray(`   Activity: ${context.activity}`));
    }
    console.log(chalk.cyan(`\n   💡 Tip: Use 'groot remember --list' to see all entries`));
  });

// ============================================================================
// groot config - View and manage configuration
// ============================================================================
program
  .command('config')
  .description('View or manage GROOT configuration')
  .option('-l, --list', 'List all configuration values')
  .option('-g, --get <key>', 'Get a specific config value (e.g., llm.model)')
  .option('--init', 'Create a .grootrc file in current directory')
  .option('--init-user', 'Create ~/.groot/config.yaml user config')
  .action(async (options) => {
    // List all config
    if (options.list) {
      console.log(LOGO);
      console.log(chalk.cyan('Current Configuration:\n'));

      const config = loadExtendedConfig();
      console.log(yamlStringify(config));

      // Show config file locations
      console.log(chalk.gray('\nConfig file locations:'));
      console.log(chalk.gray(`  User:    ${getUserConfigPath()}`));
      const projectPath = getProjectConfigPath();
      console.log(chalk.gray(`  Project: ${projectPath || '(none)'}`));
      return;
    }

    // Get specific value
    if (options.get) {
      const config = loadExtendedConfig();
      const value = getConfigValue(config, options.get);

      if (value === undefined) {
        console.log(chalk.gray('(not set)'));
      } else if (typeof value === 'object') {
        console.log(yamlStringify(value));
      } else {
        console.log(value);
      }
      return;
    }

    // Init project config
    if (options.init) {
      const configPath = join(process.cwd(), '.grootrc');

      if (existsSync(configPath)) {
        const overwrite = await confirm({
          message: '.grootrc already exists. Overwrite?',
          default: false,
        });
        if (!overwrite) {
          console.log(chalk.gray('Cancelled.'));
          return;
        }
      }

      const template = generateGrootrcTemplate();
      await writeFile(configPath, template, 'utf-8');
      console.log(chalk.green(`Created ${configPath}`));
      console.log(chalk.gray('\nEdit this file to customize GROOT settings for this project.'));
      return;
    }

    // Init user config
    if (options.initUser) {
      await initUserGrootDir();

      const configPath = getUserConfigPath();

      if (existsSync(configPath)) {
        const overwrite = await confirm({
          message: `${configPath} already exists. Overwrite?`,
          default: false,
        });
        if (!overwrite) {
          console.log(chalk.gray('Cancelled.'));
          return;
        }
      }

      const template = generateUserConfigTemplate();
      await writeFile(configPath, template, 'utf-8');
      console.log(chalk.green(`Created ${configPath}`));
      console.log(chalk.gray('\nEdit this file to customize GROOT settings for all projects.'));
      return;
    }

    // Default: show help
    console.log(LOGO);
    console.log(chalk.cyan('Configuration Commands:\n'));
    console.log(chalk.white('  groot config --list        Show all configuration'));
    console.log(chalk.white('  groot config --get <key>   Get specific value'));
    console.log(chalk.white('  groot config --init        Create project .grootrc'));
    console.log(chalk.white('  groot config --init-user   Create user config'));
    console.log();
    console.log(chalk.gray('Config files are loaded in this order (later overrides earlier):'));
    console.log(chalk.gray('  1. Defaults'));
    console.log(chalk.gray('  2. ~/.groot/config.yaml (user)'));
    console.log(chalk.gray('  3. .grootrc (project)'));
    console.log(chalk.gray('  4. Environment variables'));
  });

// ============================================================================
// groot seed - Scaffold project files
// ============================================================================
program
  .command('seed')
  .description('Seed - scaffold project files for a curriculum phase')
  .option('-p, --phase <number>', 'Phase number to scaffold')
  .option('-d, --dry-run', 'Preview what would be created without making changes')
  .option('-f, --force', 'Overwrite existing files')
  .option('-t, --template <type>', 'Project template (typescript, javascript, python, minimal, react, vue)')
  .option('-o, --output <dir>', 'Output directory', './')
  .option('-v, --verbose', 'Show detailed output')
  .option('--no-hooks', 'Skip post-scaffold hooks (e.g., npm install)')
  .option('--list-templates', 'List all available templates')
  .option('--tdd', 'TDD mode: Generate working tests using Claude (tests fail until you implement)')
  .option('--skip-specs', 'Skip generating SDD spec artifacts')
  .action(async (options) => {
    // List templates mode
    if (options.listTemplates) {
      console.log(LOGO);
      console.log(chalk.cyan('Available Templates:\n'));

      const templates = await getAvailableTemplateTypes();
      const { isBuiltinTemplate, getCustomTemplates } = await import('../templates');

      for (const name of templates) {
        const def = await getTemplate(name);
        const isBuiltin = isBuiltinTemplate(name);
        const label = isBuiltin ? '' : chalk.magenta(' [custom]');
        console.log(chalk.white(`  ${name.padEnd(15)} ${def?.displayName || name}${label}`));
        console.log(chalk.gray(`                  ${def?.description || ''}`));
      }

      const customCount = getCustomTemplates().length;
      if (customCount > 0) {
        console.log(chalk.gray(`\n${customCount} custom template(s) from ~/.groot/templates/ or ./templates/`));
      }
      return;
    }

    console.log(LOGO);
    console.log(chalk.green(`\n🌾 GROOT - Seed Your Project\n`));

    try {
      // Check prerequisites
      if (!isGrootInitialized() || !hasCurriculum()) {
        console.log(chalk.yellow('No curriculum found in this project.'));
        console.log(chalk.gray('Generate one with: groot plant "your topic"'));
        return;
      }

      // Load curriculum
      const curriculum = await getCurrentCurriculum();
      if (!curriculum) {
        console.log(chalk.red('Failed to load curriculum.'));
        return;
      }

      // Show curriculum info
      console.log(chalk.cyan(`📚 Curriculum: ${curriculum.title}\n`));

      // Select phase
      let selectedPhase: number;

      if (options.phase) {
        selectedPhase = parseInt(options.phase, 10);
        const phase = curriculum.phases.find(p => p.number === selectedPhase);
        if (!phase) {
          console.error(chalk.red(`Phase ${selectedPhase} not found in curriculum`));
          console.log(chalk.gray(`Available phases: ${curriculum.phases.map(p => p.number).join(', ')}`));
          return;
        }
      } else {
        // Interactive phase selection
        const phaseChoices = curriculum.phases.map(p => ({
          name: `Phase ${p.number}: ${p.title} (${p.deliverables.length} deliverables)`,
          value: p.number,
        }));

        selectedPhase = await select({
          message: 'Select a phase to scaffold:',
          choices: phaseChoices,
        });
      }

      const phase = curriculum.phases.find(p => p.number === selectedPhase)!;

      // Select template
      let templateType: string = options.template || 'typescript';

      if (!options.template) {
        // Interactive template selection
        const availableTemplates = await getAvailableTemplateTypes();
        const templateChoices = await Promise.all(
          availableTemplates.map(async (t) => {
            const def = await getTemplate(t);
            return {
              name: `${def?.displayName || t} - ${def?.description || ''}`,
              value: t,
            };
          })
        );

        templateType = await select({
          message: 'Select a project template:',
          choices: templateChoices,
        });
      }

      // Validate template
      const template = await getTemplate(templateType);
      if (!template) {
        console.error(chalk.red(`Invalid template: ${templateType}`));
        console.log(chalk.gray('Available templates: typescript, javascript, python, minimal'));
        return;
      }

      // Show scaffold plan
      console.log(chalk.cyan('\n📋 Scaffold Plan:'));
      console.log(chalk.white(`   Phase: ${phase.number} - ${phase.title}`));
      console.log(chalk.white(`   Template: ${template.displayName}`));
      console.log(chalk.white(`   Output: ${options.output}`));
      console.log(chalk.white(`   Deliverables: ${phase.deliverables.length}`));
      if (options.tdd) {
        console.log(chalk.yellow(`   Mode: TDD (Claude will generate working tests)`));
      }

      if (options.dryRun) {
        console.log(chalk.yellow('\n   [DRY RUN - No files will be created]\n'));
      }

      // Confirm if not dry-run
      if (!options.dryRun) {
        const proceed = await confirm({
          message: 'Proceed with scaffolding?',
          default: true,
        });

        if (!proceed) {
          console.log(chalk.gray('\nScaffolding cancelled.'));
          return;
        }
      }

      // Execute scaffolding
      const result = await scaffoldPhase(curriculum, {
        phaseNumber: selectedPhase,
        templateType,
        outputDir: options.output,
        dryRun: options.dryRun || false,
        force: options.force || false,
        verbose: options.verbose || false,
        skipHooks: options.hooks === false,  // Commander sets this to false when --no-hooks is used
        tdd: options.tdd || false,  // TDD mode: generate working tests with Claude
      });

      // Display results
      if (result.filesCreated.length > 0) {
        console.log(chalk.green(`\n✅ ${options.dryRun ? 'Would create' : 'Created'} ${result.filesCreated.length} files:`));
        result.filesCreated.forEach(f => {
          console.log(chalk.gray(`   ${options.dryRun ? '📝' : '✓'} ${f}`));
        });
      }

      if (result.filesSkipped.length > 0) {
        console.log(chalk.yellow(`\n⚠️  Skipped ${result.filesSkipped.length} existing files:`));
        result.filesSkipped.forEach(f => {
          console.log(chalk.gray(`   → ${f}`));
        });
        console.log(chalk.gray('   Use --force to overwrite'));
      }

      if (result.errors.length > 0) {
        console.log(chalk.red(`\n❌ Errors:`));
        result.errors.forEach(e => {
          console.log(chalk.red(`   ${e}`));
        });
      }

      // Display hook results
      if (result.hooksExecuted && result.hooksExecuted.length > 0) {
        console.log(chalk.cyan('\n🔧 Post-scaffold hooks:'));
        displayHookResults(result.hooksExecuted);
      } else if (!options.dryRun && options.hooks !== false) {
        console.log(chalk.gray('\n   No post-scaffold hooks to run.'));
      }

      // Generate SDD specs (unless --skip-specs or dry-run)
      let specsGenerated: string[] = [];
      let constitutionPath: string | undefined;

      if (!options.dryRun && !options.skipSpecs) {
        console.log(chalk.cyan('\n📋 Generating SDD artifacts...'));

        try {
          // Generate constitution first
          constitutionPath = await writeConstitution({
            curriculum,
            templateType,
            outputDir: options.output,
          });
          console.log(chalk.green(`   ✓ Constitution: .groot/constitution.md`));

          // Generate specs for the phase
          const specResults = await generateSpecsForPhase(phase, {
            outputDir: options.output,
            phaseNumber: selectedPhase,
            curriculum,
            templateType,
            verbose: options.verbose,
          });

          for (const specResult of specResults.results) {
            if (specResult.filesCreated.length > 0) {
              specsGenerated.push(...specResult.filesCreated);
              console.log(chalk.green(`   ✓ ${specResult.deliverableTitle}`));
            } else if (specResult.error) {
              console.log(chalk.yellow(`   ⚠ ${specResult.deliverableTitle}: ${specResult.error}`));
            }
          }
        } catch (specError) {
          console.log(chalk.yellow(`   ⚠ Spec generation failed: ${specError}`));
          console.log(chalk.gray('   You can generate specs later with: groot solve'));
        }
      } else if (options.skipSpecs) {
        console.log(chalk.gray('\n   Skipping spec generation (--skip-specs)'));
      }

      // Next steps with template-specific walkthrough
      if (result.success && !options.dryRun) {
        console.log(chalk.cyan('\n🌱 Project Walkthrough:'));
        console.log(chalk.white('\n   What was created:'));

        // Count file types
        const srcFiles = result.filesCreated.filter(f => f.includes('/src/') || f.startsWith('src/'));
        const testFiles = result.filesCreated.filter(f => f.includes('/tests/') || f.startsWith('tests/'));
        const configFiles = result.filesCreated.filter(f =>
          f.endsWith('.json') || f.endsWith('.ini') || f.endsWith('.js') && !f.includes('/src/')
        );

        console.log(chalk.gray(`   • ${srcFiles.length} source file(s) in src/`));
        if (testFiles.length > 0) {
          console.log(chalk.gray(`   • ${testFiles.length} test file(s) in tests/`));
          if (options.tdd && result.testsGenerated) {
            console.log(chalk.yellow(`     ↳ TDD mode: ${result.testsGenerated.length} tests generated with Claude`));
          }
        }
        console.log(chalk.gray(`   • ${configFiles.length} config file(s)`));
        if (constitutionPath) {
          console.log(chalk.gray(`   • 1 constitution file (.groot/constitution.md)`));
        }
        if (specsGenerated.length > 0) {
          console.log(chalk.gray(`   • ${specsGenerated.length} spec file(s) in specs/phase-${selectedPhase}/`));
        }

        // Template-specific instructions
        console.log(chalk.white('\n   Getting started:'));

        if (templateType === 'typescript' || templateType === 'javascript') {
          console.log(chalk.cyan('   $ npm install'));
          console.log(chalk.gray('     Install dependencies'));
          console.log(chalk.cyan('   $ npm test'));
          console.log(chalk.gray('     Run tests (will fail until you implement)'));
          console.log(chalk.cyan('   $ npm run build'));
          console.log(chalk.gray('     Compile TypeScript'));
          console.log(chalk.cyan('   $ npm start'));
          console.log(chalk.gray('     Run the compiled code'));
        } else if (templateType === 'python') {
          console.log(chalk.cyan('   $ pip install -r requirements.txt'));
          console.log(chalk.gray('     Install dependencies'));
          console.log(chalk.cyan('   $ pytest'));
          console.log(chalk.gray('     Run tests (will fail until you implement)'));
          console.log(chalk.cyan('   $ pytest --cov=src'));
          console.log(chalk.gray('     Run tests with coverage'));
          console.log(chalk.cyan('   $ python main.py'));
          console.log(chalk.gray('     Run the main script'));
        } else if (templateType === 'react' || templateType === 'vue') {
          console.log(chalk.cyan('   $ npm install'));
          console.log(chalk.gray('     Install dependencies'));
          console.log(chalk.cyan('   $ npm run dev'));
          console.log(chalk.gray('     Start development server'));
          console.log(chalk.cyan('   $ npm run build'));
          console.log(chalk.gray('     Build for production'));
        }

        // Show deliverables to implement
        console.log(chalk.white('\n   Deliverables to implement:'));
        for (const del of phase.deliverables) {
          console.log(chalk.yellow(`   □ ${del.title}`));
          console.log(chalk.gray(`     ${del.description.slice(0, 80)}${del.description.length > 80 ? '...' : ''}`));
        }

        console.log(chalk.white('\n   Learning workflow:'));
        if (options.tdd) {
          console.log(chalk.yellow('   TDD Mode - Red → Green → Refactor:'));
          console.log(chalk.gray(`   1. ${chalk.cyan('groot check')} - Run tests (they will fail - RED)`));
          console.log(chalk.gray(`   2. Read specs/phase-${selectedPhase}/<deliverable>/spec.md`));
          console.log(chalk.gray(`   3. Use Claude Code or Copilot to implement`));
          console.log(chalk.gray(`   4. ${chalk.cyan('groot check')} - Verify tests pass (GREEN)`));
          console.log(chalk.gray(`   5. ${chalk.cyan('groot solve --prompt')} - Get a ready-to-paste prompt if stuck`));
        } else {
          console.log(chalk.gray(`   1. ${chalk.cyan(`groot wake --phase ${selectedPhase}`)} - Start learning session`));
          console.log(chalk.gray(`   2. Read specs/phase-${selectedPhase}/<deliverable>/spec.md`));
          console.log(chalk.gray(`   3. ${chalk.cyan('groot ask "question"')} - Ask tutor for help`));
          console.log(chalk.gray(`   4. Use Claude Code or Copilot to implement`));
          console.log(chalk.gray(`   5. ${chalk.cyan('groot check')} - Verify tests pass`));
          console.log(chalk.gray(`   6. ${chalk.cyan('groot remember "insight"')} - Save learnings`));
          console.log(chalk.gray(`   7. ${chalk.cyan('groot rest')} - End session when done`));
        }
      }

    } catch (error) {
      console.error(chalk.red('Error scaffolding project:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// groot check - Run tests and verify phase completion
// ============================================================================
program
  .command('check')
  .description('Check - validate specs and run tests for phase completion')
  .option('-p, --phase <number>', 'Phase number to check')
  .option('-v, --verbose', 'Show detailed test output')
  .option('--specs-only', 'Only validate spec artifacts, skip tests')
  .option('--update', 'Update curriculum with completion status')
  .action(async (options) => {
    console.log(LOGO);
    console.log(chalk.green(`\n🧪 GROOT - Check Phase Completion\n`));

    try {
      // Check prerequisites
      if (!isGrootInitialized() || !hasCurriculum()) {
        console.log(chalk.yellow('No curriculum found in this project.'));
        console.log(chalk.gray('Generate one with: groot plant "your topic"'));
        process.exit(1);
      }

      // Load curriculum
      const curriculum = await getCurrentCurriculum();
      if (!curriculum) {
        console.error(chalk.red('Failed to load curriculum'));
        process.exit(1);
      }

      // Detect project type
      const projectType = detectProjectType('./');
      if (projectType === 'unknown') {
        console.log(chalk.yellow('Could not detect project type.'));
        console.log(chalk.gray('Make sure you have run "groot seed" first.'));
        process.exit(1);
      }

      console.log(chalk.gray(`Detected project type: ${projectType}`));

      // Select phase
      let selectedPhase: number;

      if (options.phase) {
        selectedPhase = parseInt(options.phase, 10);
      } else {
        // Show phase selection
        const phaseChoices = curriculum.phases.map(p => ({
          value: p.number,
          name: `Phase ${p.number}: ${p.title} (${p.deliverables.length} deliverables)`,
        }));

        selectedPhase = await select({
          message: 'Select a phase to check:',
          choices: phaseChoices,
        });
      }

      const phase = curriculum.phases.find(p => p.number === selectedPhase);
      if (!phase) {
        console.error(chalk.red(`Phase ${selectedPhase} not found`));
        process.exit(1);
      }

      console.log(chalk.cyan(`\nChecking Phase ${phase.number}: ${phase.title}\n`));

      // ─────────────────────────────────────────────────────────────────────
      // Stage 1: Spec Validation
      // ─────────────────────────────────────────────────────────────────────
      console.log(chalk.white('Stage 1: Spec Validation\n'));

      const specValidation = await validatePhaseSpecs(phase, './');

      // Display spec validation results
      if (specValidation.constitutionValid) {
        console.log(chalk.green('  ✓ Constitution exists'));
      } else {
        console.log(chalk.yellow('  ⚠ Constitution missing (.groot/constitution.md)'));
      }

      for (const result of specValidation.results) {
        const allPresent = result.specExists && result.planExists && result.tasksExists;
        const hasIssues = result.issues.length > 0;

        if (allPresent && !hasIssues) {
          console.log(chalk.green(`  ✓ ${result.deliverableTitle}`));
        } else {
          console.log(chalk.yellow(`  ⚠ ${result.deliverableTitle}`));
          for (const issue of result.issues) {
            console.log(chalk.gray(`      - ${issue}`));
          }
        }
      }

      // Spec summary
      const specsValid = specValidation.allValid;
      console.log(chalk.white('\n  ─────────────────────────────────────'));
      if (specsValid) {
        console.log(chalk.green('  Stage 1 Result: All specs valid ✓'));
      } else {
        const missingSpecs = specValidation.results.filter(
          r => !r.specExists || !r.planExists || !r.tasksExists
        ).length;
        console.log(chalk.yellow(`  Stage 1 Result: ${missingSpecs} deliverable(s) missing specs`));
        console.log(chalk.gray('  Run "groot solve" to generate missing specs'));
      }

      // If --specs-only, stop here
      if (options.specsOnly) {
        if (!specsValid) {
          process.exit(1);
        }
        return;
      }

      // ─────────────────────────────────────────────────────────────────────
      // Stage 2: Test Validation
      // ─────────────────────────────────────────────────────────────────────
      console.log(chalk.white('\n\nStage 2: Test Validation\n'));
      console.log(chalk.gray(`Running tests for ${phase.deliverables.length} deliverables...\n`));

      // Run tests with spinner
      const spinner = ora({
        text: 'Running tests...',
        spinner: 'dots',
      }).start();

      const results = await runPhaseTests(phase, './', { verbose: options.verbose });

      if (results.error) {
        spinner.fail('Test run failed');
        console.error(chalk.red(`\n${results.error}`));
        process.exit(1);
      }

      spinner.stop();

      // Display test results
      for (const result of results.results) {
        const icon = result.passed ? chalk.green('✅') : chalk.red('❌');
        let status: string;
        if (result.totalTests === 0) {
          // No tests found - likely import/collection error
          status = chalk.yellow('tests failed to load (check imports)');
        } else if (result.passed) {
          status = chalk.green(`${result.passedTests}/${result.totalTests} passed`);
        } else if (result.skippedTests > 0 && result.failedTests === 0) {
          status = chalk.yellow(`${result.skippedTests} skipped (not implemented)`);
        } else {
          status = chalk.red(`${result.failedTests}/${result.totalTests} failed`);
        }

        console.log(`${icon} ${chalk.white(result.deliverableTitle)} - ${status}`);

        if (!result.passed && result.failedTestNames.length > 0) {
          for (const failedTest of result.failedTestNames.slice(0, 3)) {
            console.log(chalk.gray(`   └─ ${failedTest}`));
          }
          if (result.failedTestNames.length > 3) {
            console.log(chalk.gray(`   └─ ... and ${result.failedTestNames.length - 3} more`));
          }
        }
      }

      // Summary
      const completionPercent = Math.round((results.completedDeliverables / results.totalDeliverables) * 100);
      console.log(chalk.white('\n─────────────────────────────────────'));
      console.log(chalk.white(`Phase ${phase.number} Progress: `) +
        (results.success
          ? chalk.green(`${results.completedDeliverables}/${results.totalDeliverables} deliverables complete (${completionPercent}%) ✅`)
          : chalk.yellow(`${results.completedDeliverables}/${results.totalDeliverables} deliverables complete (${completionPercent}%)`)));

      // Update curriculum if requested
      if (options.update) {
        let updated = false;

        for (const result of results.results) {
          if (result.passed && result.deliverableId) {
            const deliverable = phase.deliverables.find(d => d.id === result.deliverableId);
            if (deliverable && !deliverable.completed) {
              deliverable.completed = true;
              updated = true;
            }
          }
        }

        // Update phase status if all deliverables complete
        if (results.success && phase.status !== 'completed') {
          phase.status = 'completed';

          // Unlock next phase
          const nextPhase = curriculum.phases.find(p => p.number === phase.number + 1);
          if (nextPhase && nextPhase.status === 'locked') {
            nextPhase.status = 'available';
          }

          updated = true;
        }

        if (updated) {
          await saveCurriculum(curriculum);
          console.log(chalk.green('\n✅ Curriculum updated with completion status'));

          // Auto-sync README.md and OBJECTIVES.md with completion status
          const syncResult = await syncWithCurriculum(curriculum, phase, {
            outputDir: './',
            verbose: options.verbose,
          });
          if (syncResult.filesModified.length > 0) {
            console.log(chalk.green('📝 Synced project files with completion status'));
          }
        }
      }

      // Next steps
      if (!results.success) {
        console.log(chalk.cyan('\n🌱 Next steps:'));
        console.log(chalk.gray('   1. Review the spec files for each deliverable'));
        console.log(chalk.gray('   2. Use Claude Code or Copilot to implement'));
        console.log(chalk.gray('   3. Run "groot check" again to verify'));
        console.log(chalk.gray(`   4. Use "groot solve --prompt" for a ready-to-paste prompt`));
      } else {
        console.log(chalk.green('\n🎉 All tests passing! Phase complete.'));
        if (!options.update) {
          console.log(chalk.gray('   Run "groot check --update" to mark deliverables complete'));
        }
        const nextPhase = curriculum.phases.find(p => p.number === phase.number + 1);
        if (nextPhase) {
          console.log(chalk.gray(`   Ready for Phase ${nextPhase.number}: ${nextPhase.title}`));
        }
      }

      // Show verbose output if requested
      if (options.verbose && results.rawOutput) {
        console.log(chalk.gray('\n─── Raw Test Output ───────────────────'));
        console.log(chalk.gray(results.rawOutput.slice(0, 2000)));
        if (results.rawOutput.length > 2000) {
          console.log(chalk.gray('... (truncated)'));
        }
      }

    } catch (error) {
      console.error(chalk.red('Error running tests:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// groot sync - Sync README/OBJECTIVES with curriculum completion status
// ============================================================================
program
  .command('sync')
  .description('Sync README.md and OBJECTIVES.md with curriculum completion status')
  .option('-p, --phase <number>', 'Phase number to sync (default: current phase)')
  .option('--dry-run', 'Preview changes without writing files')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    console.log(LOGO);
    console.log(chalk.green(`\n📝 GROOT - Sync Project Files\n`));

    try {
      // Check prerequisites
      if (!isGrootInitialized() || !hasCurriculum()) {
        console.log(chalk.yellow('No curriculum found in this project.'));
        console.log(chalk.gray('Generate one with: groot plant "your topic"'));
        process.exit(1);
      }

      // Load curriculum
      const curriculum = await getCurrentCurriculum();
      if (!curriculum) {
        console.error(chalk.red('Failed to load curriculum'));
        process.exit(1);
      }

      // Determine which phase to sync
      let phaseNumber: number;
      if (options.phase) {
        phaseNumber = parseInt(options.phase, 10);
      } else {
        // Use current phase index
        phaseNumber = curriculum.currentPhaseIndex + 1;
      }

      const phase = curriculum.phases.find(p => p.number === phaseNumber);
      if (!phase) {
        console.error(chalk.red(`Phase ${phaseNumber} not found`));
        process.exit(1);
      }

      console.log(chalk.cyan(`Syncing Phase ${phase.number}: ${phase.title}`));
      console.log(chalk.gray(`Status: ${phase.status}`));

      // Count completed deliverables
      const completedCount = phase.deliverables.filter(d => d.completed).length;
      const totalCount = phase.deliverables.length;
      console.log(chalk.gray(`Deliverables: ${completedCount}/${totalCount} completed\n`));

      // Perform sync
      const result = await fullSyncWithCurriculum(curriculum, phase, {
        outputDir: './',
        verbose: options.verbose,
        dryRun: options.dryRun,
      });

      // Report results
      if (result.filesModified.length > 0) {
        console.log(chalk.green(`\n✅ ${options.dryRun ? 'Would sync' : 'Synced'} ${result.filesModified.length} file(s):`));
        for (const file of result.filesModified) {
          console.log(chalk.gray(`   - ${file}`));
        }
      } else {
        console.log(chalk.yellow('\nNo changes needed - files already in sync.'));
      }

      if (result.errors.length > 0) {
        console.log(chalk.red('\nErrors:'));
        for (const error of result.errors) {
          console.log(chalk.red(`   - ${error}`));
        }
      }

      // Show deliverable status
      console.log(chalk.cyan('\nDeliverable Status:'));
      for (const del of phase.deliverables) {
        const icon = del.completed ? chalk.green('✓') : chalk.gray('○');
        console.log(`  ${icon} ${del.title}`);
      }

    } catch (error) {
      console.error(chalk.red('Error syncing files:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// groot solve - Generate solutions for stuck learners
// ============================================================================
program
  .command('solve')
  .description('Solve - generate SDD specs to help implement deliverables')
  .option('-p, --phase <number>', 'Phase number to solve')
  .option('-d, --deliverable <title>', 'Specific deliverable to solve')
  .option('--prompt', 'Output a Claude Code prompt instead of generating specs')
  .option('--force', 'Overwrite existing spec files')
  .option('--dry-run', 'Preview what would be generated without writing files')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    console.log(LOGO);
    console.log(chalk.green(`\n📋 GROOT - Spec-Driven Solution Generator\n`));

    try {
      // Check prerequisites
      if (!isGrootInitialized() || !hasCurriculum()) {
        console.log(chalk.yellow('No curriculum found in this project.'));
        console.log(chalk.gray('Generate one with: groot plant "your topic"'));
        process.exit(1);
      }

      // Load curriculum
      const curriculum = await getCurrentCurriculum();
      if (!curriculum) {
        console.error(chalk.red('Failed to load curriculum'));
        process.exit(1);
      }

      // Detect project type (template type)
      const projectType = detectProjectType('./');
      if (projectType === 'unknown') {
        console.log(chalk.yellow('Could not detect project type.'));
        console.log(chalk.gray('Make sure you have run "groot seed" first.'));
        process.exit(1);
      }

      const templateType = projectType === 'typescript' ? 'typescript' : 'python';
      console.log(chalk.gray(`Detected project type: ${templateType}`));

      // Select phase
      let selectedPhase: number;

      if (options.phase) {
        selectedPhase = parseInt(options.phase, 10);
      } else {
        // Show phase selection
        const phaseChoices = curriculum.phases.map(p => ({
          value: p.number,
          name: `Phase ${p.number}: ${p.title} (${p.deliverables.length} deliverables)`,
        }));

        selectedPhase = await select({
          message: 'Select a phase to solve:',
          choices: phaseChoices,
        });
      }

      const phase = curriculum.phases.find(p => p.number === selectedPhase);
      if (!phase) {
        console.error(chalk.red(`Phase ${selectedPhase} not found`));
        process.exit(1);
      }

      // If specific deliverable requested
      if (options.deliverable) {
        const deliverable = phase.deliverables.find(
          d => d.title.toLowerCase().includes(options.deliverable.toLowerCase())
        );

        if (!deliverable) {
          console.error(chalk.red(`Deliverable "${options.deliverable}" not found in Phase ${selectedPhase}`));
          console.log(chalk.gray('\nAvailable deliverables:'));
          phase.deliverables.forEach(d => {
            console.log(chalk.gray(`  - ${d.title}`));
          });
          process.exit(1);
        }

        // If --prompt flag, just output the prompt
        if (options.prompt) {
          const prompt = getPrompt(deliverable, phase, './', templateType);
          console.log(chalk.cyan(`\n📋 Claude Code Prompt for "${deliverable.title}":\n`));
          console.log(chalk.white('─'.repeat(60)));
          console.log(prompt);
          console.log(chalk.white('─'.repeat(60)));
          console.log(chalk.gray('\nCopy the above prompt and paste it into Claude Code or Copilot.'));
          return;
        }

        console.log(chalk.cyan(`\nGenerating specs for: ${deliverable.title}`));

        if (options.dryRun) {
          console.log(chalk.yellow('[DRY RUN - No files will be written]\n'));
        }

        const spinner = ora({
          text: 'Generating spec artifacts...',
          spinner: 'dots',
        }).start();

        const result = await solveDeliverable(deliverable, phase, {
          outputDir: './',
          curriculum,
          templateType,
          dryRun: options.dryRun,
          verbose: options.verbose,
          force: options.force,
        });

        if (result.error) {
          spinner.fail('Generation failed');
          console.error(chalk.red(`\n${result.error}`));
          process.exit(1);
        }

        spinner.succeed('Specs generated!');

        // Display results
        if (result.filesCreated.length > 0) {
          console.log(chalk.white('\nGenerated files:'));
          for (const file of result.filesCreated) {
            console.log(chalk.green(`  ✅ ${file}`));
          }
        }
        if (result.filesSkipped.length > 0) {
          console.log(chalk.gray('\nSkipped (already exist):'));
          for (const file of result.filesSkipped) {
            console.log(chalk.gray(`  ⏭️  ${file}`));
          }
        }

        // Show prompt
        if (result.prompt) {
          console.log(chalk.cyan('\n📋 Claude Code Prompt:\n'));
          console.log(chalk.white('─'.repeat(60)));
          console.log(result.prompt);
          console.log(chalk.white('─'.repeat(60)));
        }

      } else {
        // Solve entire phase
        console.log(chalk.cyan(`\nGenerating specs for Phase ${phase.number}: ${phase.title}`));
        console.log(chalk.gray(`${phase.deliverables.length} deliverables\n`));

        // If --prompt flag, output phase prompt
        if (options.prompt) {
          const prompt = getPhasePrompt(phase, './', templateType);
          console.log(chalk.cyan(`\n📋 Claude Code Prompt for Phase ${phase.number}:\n`));
          console.log(chalk.white('─'.repeat(60)));
          console.log(prompt);
          console.log(chalk.white('─'.repeat(60)));
          console.log(chalk.gray('\nCopy the above prompt and paste it into Claude Code or Copilot.'));
          return;
        }

        if (options.dryRun) {
          console.log(chalk.yellow('[DRY RUN - No files will be written]\n'));
        }

        const spinner = ora({
          text: 'Generating spec artifacts...',
          spinner: 'dots',
        }).start();

        const results = await solvePhase(phase, {
          outputDir: './',
          curriculum,
          templateType,
          dryRun: options.dryRun,
          verbose: options.verbose,
          force: options.force,
        });

        spinner.stop();

        // Display results
        console.log(chalk.white('Results:\n'));

        for (const result of results.results) {
          if (result.error) {
            console.log(chalk.red(`❌ ${result.deliverableTitle}`));
            console.log(chalk.gray(`   Error: ${result.error}`));
          } else {
            console.log(chalk.green(`✅ ${result.deliverableTitle}`));
            if (result.filesCreated.length > 0) {
              console.log(chalk.gray(`   └─ ${result.specDir}/`));
            } else if (result.filesSkipped.length > 0) {
              console.log(chalk.gray(`   └─ (specs already exist)`));
            }
          }
        }

        // Summary
        const successCount = results.results.filter(r => !r.error).length;
        console.log(chalk.white('\n─────────────────────────────────────'));
        console.log(chalk.white(`Generated specs for: ${successCount}/${results.results.length} deliverables`));
      }

      // Next steps - SDD workflow
      console.log(chalk.cyan('\n📚 Spec-Driven Development Workflow:'));
      console.log(chalk.gray('   1. Read the spec.md for each deliverable'));
      console.log(chalk.gray('   2. Review plan.md for the implementation approach'));
      console.log(chalk.gray('   3. Follow tasks.md as your implementation checklist'));
      console.log(chalk.gray('   4. Use Claude Code or GitHub Copilot to implement'));
      console.log(chalk.gray('   5. Run "groot check" to verify tests pass'));

      console.log(chalk.cyan('\n💡 Quick Start:'));
      console.log(chalk.gray(`   groot solve --phase ${selectedPhase} --prompt`));
      console.log(chalk.gray('   ↳ Generates a ready-to-paste prompt for Claude Code\n'));

    } catch (error) {
      console.error(chalk.red('Error generating specs:'), error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
