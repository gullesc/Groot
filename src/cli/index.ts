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
import { GROWTH_STAGE_ICONS } from '../types';

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
// groot plant - Generate a curriculum (placeholder)
// ============================================================================
program
  .command('plant <topic...>')
  .description('Plant a seed - generate a new learning curriculum')
  .action((topicParts: string[]) => {
    const topic = topicParts.join(' ');
    console.log(LOGO);
    console.log(chalk.yellow(`🌱 Seedling agent is still growing...`));
    console.log(chalk.gray(`   The curriculum generator will be implemented in Phase 2.`));
    console.log(chalk.gray(`   Topic requested: "${topic}"`));
    console.log();
    console.log(chalk.cyan(`For now, try: ${chalk.white('groot ask "What should I learn about ' + topic + '?"')}`));
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
