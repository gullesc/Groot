/**
 * Base Agent Class
 * 
 * All GROOT agents (Seedling, Bark, Canopy) extend this base class.
 * Provides common functionality for AI interaction and BEADS integration.
 */

import Anthropic from '@anthropic-ai/sdk';
import { 
  AgentContext, 
  AgentMessage, 
  AgentResponse, 
  AgentTool,
  AgentName 
} from '../types';

export abstract class BaseAgent {
  /** Unique identifier for this agent */
  abstract readonly name: AgentName;
  
  /** Display name with emoji */
  abstract readonly displayName: string;
  
  /** System prompt that defines the agent's personality and capabilities */
  abstract readonly systemPrompt: string;
  
  /** Tools available to this agent */
  abstract readonly tools: AgentTool[];

  protected client: Anthropic;
  protected model: string;
  protected context: AgentContext;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.context = {
      conversationHistory: [],
    };
  }

  /**
   * Set the agent's context (curriculum, phase, etc.)
   */
  setContext(context: Partial<AgentContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Get the current context
   */
  getContext(): AgentContext {
    return this.context;
  }

  /**
   * Build the full system prompt including context
   */
  protected buildSystemPrompt(): string {
    let prompt = this.systemPrompt;

    if (this.context.curriculum) {
      prompt += `\n\n## Current Curriculum Context\n`;
      prompt += `Title: ${this.context.curriculum.title}\n`;
      prompt += `Topic: ${this.context.curriculum.topic}\n`;
      prompt += `Growth Stage: ${this.context.curriculum.growthStage}\n`;
    }

    if (this.context.currentPhase) {
      prompt += `\n## Current Phase\n`;
      prompt += `Phase ${this.context.currentPhase.number}: ${this.context.currentPhase.title}\n`;
      prompt += `Status: ${this.context.currentPhase.status}\n`;
    }

    return prompt;
  }

  /**
   * Convert tools to Anthropic's tool format
   */
  protected getAnthropicTools(): Anthropic.Tool[] {
    return this.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
    }));
  }

  /**
   * Execute a tool call
   */
  protected async executeTool(toolName: string, input: unknown): Promise<unknown> {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    return tool.execute(input);
  }

  /**
   * Override a tool's execute function at runtime.
   * Used for injecting callbacks like clarification prompts.
   */
  setToolExecutor(toolName: string, executor: (input: unknown) => Promise<unknown>): void {
    const tool = this.tools.find(t => t.name === toolName);
    if (tool) {
      (tool as { execute: typeof executor }).execute = executor;
    }
  }

  /**
   * Send a message to the agent and get a response.
   * Implements an agentic loop that continues until the model stops calling tools.
   */
  async chat(userMessage: string): Promise<AgentResponse> {
    // Add user message to history
    this.context.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // Build messages array for API (will be extended in the loop)
    const messages: Anthropic.MessageParam[] = this.context.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    let assistantContent = '';
    const allToolCalls: AgentResponse['toolCalls'] = [];
    const maxIterations = 10; // Safety limit for tool call loops
    let iterations = 0;

    // Agentic loop: continue until model stops calling tools
    while (iterations < maxIterations) {
      iterations++;

      // Call Claude API
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 8192,
        system: this.buildSystemPrompt(),
        tools: this.getAnthropicTools().length > 0 ? this.getAnthropicTools() : undefined,
        messages,
      });

      // Process response blocks
      const toolUseBlocks: Array<{ id: string; name: string; input: unknown }> = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          assistantContent += block.text;
        } else if (block.type === 'tool_use') {
          toolUseBlocks.push({
            id: block.id,
            name: block.name,
            input: block.input,
          });
        }
      }

      // If no tool calls, we're done
      if (toolUseBlocks.length === 0 || response.stop_reason !== 'tool_use') {
        break;
      }

      // Add assistant message with tool use to conversation
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      // Execute tools and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const toolOutput = await this.executeTool(toolUse.name, toolUse.input);
        allToolCalls.push({
          toolName: toolUse.name,
          input: toolUse.input,
          output: toolOutput,
        });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(toolOutput),
        });
      }

      // Add tool results as user message for next iteration
      messages.push({
        role: 'user',
        content: toolResults,
      });
    }

    // Add final assistant response to history
    this.context.conversationHistory.push({
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date(),
      agentName: this.name,
    });

    return {
      content: assistantContent,
      toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
    };
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.context.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): AgentMessage[] {
    return this.context.conversationHistory;
  }
}
