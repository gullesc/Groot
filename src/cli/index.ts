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
import { Curriculum } from '../types';

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
// groot grow - Multi-agent collaboration (placeholder)
// ============================================================================
program
  .command('grow')
  .description('Grow - trigger multi-agent curriculum review')
  .action(() => {
    console.log(LOGO);
    console.log(chalk.yellow(`🌳 Multi-agent orchestration is still growing...`));
    console.log(chalk.gray(`   This feature will be implemented in Phase 3.`));
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
