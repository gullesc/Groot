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
   * Send a message to the agent and get a response
   */
  async chat(userMessage: string): Promise<AgentResponse> {
    // Add user message to history
    this.context.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // Build messages array for API
    const messages: Anthropic.MessageParam[] = this.context.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Call Claude API
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: this.buildSystemPrompt(),
      tools: this.getAnthropicTools().length > 0 ? this.getAnthropicTools() : undefined,
      messages,
    });

    // Process response
    let assistantContent = '';
    const toolCalls: AgentResponse['toolCalls'] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        assistantContent += block.text;
      } else if (block.type === 'tool_use') {
        // Execute the tool
        const toolOutput = await this.executeTool(block.name, block.input);
        toolCalls.push({
          toolName: block.name,
          input: block.input,
          output: toolOutput,
        });
      }
    }

    // Add assistant response to history
    this.context.conversationHistory.push({
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date(),
      agentName: this.name,
    });

    return {
      content: assistantContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
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
