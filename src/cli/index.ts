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
import { loadConfig, validateConfig } from '../core/config';
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
  getCurrentSession,
  setCurrentSession,
  findActiveSession,
  listSessions,
  endSession,
  markObjectiveComplete,
  markDeliverableComplete,
  addSessionNote,
  generateHandoff,
  formatDuration,
  getSessionSummary,
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
import { Curriculum, AgentFeedback, Session, TemplateType } from '../types';
import { input, select, checkbox, confirm } from '@inquirer/prompts';
import {
  scaffoldPhase,
  getAvailableTemplateTypes,
  getTemplate,
} from '../core/scaffold';

const program = new Command();

// ASCII art logo
const LOGO = `
  🌳 G.R.O.O.T.
  Guided Resource for Organized Objective Training
`;

program
  .name('groot')
  .description('AI-powered learning curriculum generator')
  .version('0.1.0');

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

    // Check for active session
    let session = getCurrentSession();
    if (!session) {
      session = await findActiveSession();
    }

    if (session) {
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
// groot plant - Generate a curriculum
// ============================================================================
program
  .command('plant <topic...>')
  .description('Plant a seed - generate a new learning curriculum')
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
    console.log(chalk.green(`🌿 Seedling is designing your curriculum...\n`));
    console.log(chalk.gray(`Topic: ${topic}`));
    console.log();

    try {
      // Initialize .groot directory
      await initGrootDir();

      const { createSeedlingAgent } = await import('../agents/seedling');
      const seedling = createSeedlingAgent(config.anthropicApiKey!);

      // Ask Seedling to generate a curriculum
      const prompt = `Generate a comprehensive, project-based learning curriculum for: "${topic}"

Please create a curriculum with:
- 4-6 progressive phases
- Clear learning objectives for each phase
- Hands-on deliverables (things to build)
- Key concepts and definitions
- Realistic time estimates

Use the generate_curriculum_structure tool to output the curriculum in the proper format.`;

      const response = await seedling.chat(prompt);

      // Extract curriculum from tool call
      if (response.toolCalls && response.toolCalls.length > 0) {
        const curriculumTool = response.toolCalls.find(tc => tc.toolName === 'generate_curriculum_structure');
        if (curriculumTool && curriculumTool.output) {
          let { curriculum } = curriculumTool.output as { curriculum: Curriculum };

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

      // Check for existing active session
      const existingSession = await findActiveSession();
      if (existingSession) {
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
      // Find active session
      let session = getCurrentSession();
      if (!session) {
        session = await findActiveSession();
      }

      if (!session) {
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

    console.log(chalk.green('\n📓 Learning Journal Entry Created'));
    console.log(chalk.gray(`   File: ${getJournalPath()}/${new Date().toISOString().split('T')[0]}-${entry.slug}.md`));
    if (context) {
      if (context.phase) console.log(chalk.gray(`   Phase: ${context.phase}`));
      if (context.activity) console.log(chalk.gray(`   Activity: ${context.activity}`));
    }
    console.log(chalk.cyan(`\n   💡 Tip: Use 'groot remember --list' to see all entries`));
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
  .option('-t, --template <type>', 'Project template (typescript, javascript, python, minimal)')
  .option('-o, --output <dir>', 'Output directory', './')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
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
      let templateType: TemplateType = (options.template as TemplateType) || 'typescript';

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

      // Next steps
      if (result.success && !options.dryRun) {
        console.log(chalk.cyan('\n🌱 Next steps:'));
        console.log(chalk.gray('   1. Review generated files'));
        console.log(chalk.gray(`   2. Run: groot wake --phase ${selectedPhase}`));
        console.log(chalk.gray('   3. Implement the deliverables'));
        console.log(chalk.gray('   4. Use: groot ask <question> for help'));
      }

    } catch (error) {
      console.error(chalk.red('Error scaffolding project:'), error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
