#!/usr/bin/env node

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
import { isBeadsAvailable, isBeadsInitialized, getReadyWork } from '../core/beads';
import { createBarkAgent } from '../agents/bark';
import { createOrchestrator } from '../core/orchestrator';
import {
  saveJournalEntry,
  listJournalEntries,
  getJournalEntry,
  getJournalPath,
} from '../core/journal';
import { Curriculum, AgentFeedback } from '../types';

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
  .action(() => {
    console.log(LOGO);
    
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
  .option('-o, --output <file>', 'Output file (markdown or JSON)', './curriculum.md')
  .option('--json', 'Output as JSON instead of markdown')
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

    console.log(LOGO);
    console.log(chalk.green(`🌿 Seedling is designing your curriculum...\n`));
    console.log(chalk.gray(`Topic: ${topic}`));
    console.log();

    try {
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

          // Output curriculum
          if (options.json) {
            const { writeCurriculumJSON } = await import('../core/curriculum-output');
            await writeCurriculumJSON(curriculum, options.output);
            console.log(chalk.green(`\n✅ Curriculum saved to ${options.output}`));
          } else {
            const { writeCurriculumMarkdown } = await import('../core/curriculum-output');
            await writeCurriculumMarkdown(curriculum, options.output);
            console.log(chalk.green(`\n✅ Curriculum saved to ${options.output}`));
          }

          console.log(chalk.cyan('\nNext steps:'));
          console.log(chalk.gray('  1. Review the curriculum'));
          console.log(chalk.gray('  2. Use "groot status" to see your progress'));
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
// groot wake - Start a session (placeholder)
// ============================================================================
program
  .command('wake')
  .description('Wake up - start a new learning session')
  .action(() => {
    console.log(LOGO);
    console.log(chalk.green(`☀️  Good morning! GROOT is waking up...`));
    console.log(chalk.gray(`   Session management will be implemented in Phase 4.`));
    console.log();
    
    if (isBeadsAvailable() && isBeadsInitialized()) {
      const readyWork = getReadyWork();
      if (readyWork.length > 0) {
        console.log(chalk.cyan(`Ready to grow:`));
        console.log(chalk.white(`   Next task: [${readyWork[0]?.id}] ${readyWork[0]?.title}`));
      }
    }
  });

// ============================================================================
// groot rest - End a session (placeholder)
// ============================================================================
program
  .command('rest')
  .description('Rest - end your learning session and save progress')
  .action(() => {
    console.log(LOGO);
    console.log(chalk.blue(`🌙 Time to rest...`));
    console.log(chalk.gray(`   Session management will be implemented in Phase 4.`));
    console.log();
    console.log(chalk.cyan(`Remember to sync your progress:`));
    console.log(chalk.white(`   bd sync`));
  });

// ============================================================================
// groot grow - Multi-agent collaboration
// ============================================================================
program
  .command('grow [topic...]')
  .description('Grow - generate and review curriculum with multi-agent collaboration')
  .option('-f, --file <file>', 'Review existing curriculum from file (JSON)')
  .option('-o, --output <file>', 'Output file (markdown or JSON)', './curriculum.md')
  .option('--json', 'Output as JSON instead of markdown')
  .option('--beads', 'Create BEADS epics and tasks from curriculum')
  .option('-v, --verbose', 'Show detailed output')
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

    // Create orchestrator with callbacks for progress display
    const orchestrator = createOrchestrator(
      { apiKey: config.anthropicApiKey!, verbose: options.verbose },
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
        },
        onLog: (message: string) => {
          if (options.verbose) {
            console.log(chalk.gray(`   ${message}`));
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

      // Output curriculum
      if (options.json) {
        const { writeCurriculumJSON } = await import('../core/curriculum-output');
        await writeCurriculumJSON(result.finalCurriculum, options.output);
        console.log(chalk.green(`\n📄 Curriculum saved to ${options.output}`));
      } else {
        const { writeCurriculumMarkdown } = await import('../core/curriculum-output');
        await writeCurriculumMarkdown(result.finalCurriculum, options.output);
        console.log(chalk.green(`\n📄 Curriculum saved to ${options.output}`));
      }

      // Next steps
      console.log(chalk.cyan('\nNext steps:'));
      console.log(chalk.gray('  1. Review the curriculum'));
      console.log(chalk.gray('  2. Use "groot ask" to learn about concepts'));
      if (options.beads) {
        console.log(chalk.gray('  3. Run "bd ready" to see ready work in BEADS'));
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
// groot seed - Scaffold project files (placeholder)
// ============================================================================
program
  .command('seed')
  .description('Seed - scaffold project files for current phase')
  .action(() => {
    console.log(LOGO);
    console.log(chalk.yellow(`🌾 Project scaffolding is still growing...`));
    console.log(chalk.gray(`   This feature will be implemented in Phase 5.`));
  });

// Parse arguments
program.parse();
