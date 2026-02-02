/**
 * Test Generator Module
 *
 * Generates working test implementations for deliverables using Claude.
 * These tests define the expected behavior that students must implement.
 * Used by `groot seed` to enable true TDD workflow.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Deliverable, Phase } from '../types';
import { loadConfig } from './config';
import { toPascalCase, toSnakeCase } from './scaffold';

export interface GeneratedTest {
  deliverableTitle: string;
  deliverableId?: string;
  testCode: string;
  language: 'typescript' | 'python';
}

/**
 * Generate working tests for a deliverable using Claude
 */
export async function generateTestsForDeliverable(
  deliverable: Deliverable,
  phase: Phase,
  language: 'typescript' | 'python'
): Promise<GeneratedTest> {
  const config = loadConfig();
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const testCode = language === 'python'
    ? await generatePythonTest(client, deliverable, phase)
    : await generateTypeScriptTest(client, deliverable, phase);

  return {
    deliverableTitle: deliverable.title,
    deliverableId: deliverable.id,
    testCode,
    language,
  };
}

/**
 * Generate working tests for all deliverables in a phase
 */
export async function generateTestsForPhase(
  phase: Phase,
  language: 'typescript' | 'python'
): Promise<GeneratedTest[]> {
  const results: GeneratedTest[] = [];

  for (const deliverable of phase.deliverables) {
    const result = await generateTestsForDeliverable(deliverable, phase, language);
    results.push(result);
  }

  return results;
}

/**
 * Generate Python test file using Claude
 */
async function generatePythonTest(
  client: Anthropic,
  deliverable: Deliverable,
  phase: Phase
): Promise<string> {
  const moduleName = toSnakeCase(deliverable.title);
  const className = toPascalCase(deliverable.title);

  const prompt = `You are generating pytest tests for a learning curriculum deliverable.

DELIVERABLE: ${deliverable.title}
DESCRIPTION: ${deliverable.description}

ACCEPTANCE CRITERIA:
${deliverable.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

PHASE CONTEXT: ${phase.title} - ${phase.description}

The source file structure (student will implement):
\`\`\`python
class ${className}:
    def __init__(self):
        pass

    def execute(self) -> None:
        raise NotImplementedError("Not implemented")

def create_${moduleName}() -> ${className}:
    return ${className}()
\`\`\`

Generate a COMPLETE, WORKING pytest test file that:
1. Imports from: \`from src.${moduleName} import ${className}, create_${moduleName}\`
2. Tests EACH acceptance criterion with meaningful assertions
3. Tests should FAIL initially (source raises NotImplementedError)
4. Tests should PASS once student correctly implements the source
5. Use ONLY standard library - NO external dependencies
6. Include helpful comments explaining what each test verifies
7. Tests should be educational - students learn by reading them

CRITICAL RULES:
- Do NOT use @pytest.mark.skip - tests should run and fail
- Do NOT use mock/patch unless absolutely necessary
- Keep tests SIMPLE - this is educational code
- Each test should verify ONE specific thing
- Test names should be descriptive: test_<what_it_tests>

Return ONLY the complete Python test file, no explanations.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return extractCode(content.text);
}

/**
 * Generate TypeScript test file using Claude
 */
async function generateTypeScriptTest(
  client: Anthropic,
  deliverable: Deliverable,
  phase: Phase
): Promise<string> {
  const fileName = deliverable.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const className = toPascalCase(deliverable.title);

  const prompt = `You are generating Jest tests for a learning curriculum deliverable.

DELIVERABLE: ${deliverable.title}
DESCRIPTION: ${deliverable.description}

ACCEPTANCE CRITERIA:
${deliverable.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

PHASE CONTEXT: ${phase.title} - ${phase.description}

The source file structure (student will implement):
\`\`\`typescript
export class ${className} {
  constructor() {}

  execute(): void {
    throw new Error('Not implemented');
  }
}

export function create${className}(): ${className} {
  return new ${className}();
}
\`\`\`

Generate a COMPLETE, WORKING Jest test file that:
1. Imports from: \`import { ${className}, create${className} } from '../src/${fileName}.js';\`
2. Tests EACH acceptance criterion with meaningful assertions
3. Tests should FAIL initially (source throws Error('Not implemented'))
4. Tests should PASS once student correctly implements the source
5. Use ONLY standard library - NO external dependencies
6. Include helpful comments explaining what each test verifies
7. Tests should be educational - students learn by reading them

CRITICAL RULES:
- Do NOT use it.skip() or xit() - tests should run and fail
- Do NOT use jest.mock() unless absolutely necessary
- Keep tests SIMPLE - this is educational code
- Each test should verify ONE specific thing
- Test names should be descriptive

Return ONLY the complete TypeScript test file, no explanations.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return extractCode(content.text);
}

/**
 * Extract code from Claude's response (handles markdown code blocks)
 */
function extractCode(text: string): string {
  // Pattern 1: ```language\ncode\n```
  const codeBlockMatch = text.match(/```(?:python|typescript|javascript|ts|py|js)?\s*\n([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  // Pattern 2: ```\ncode\n``` (no language specified)
  const simpleBlockMatch = text.match(/```\s*\n([\s\S]*?)```/);
  if (simpleBlockMatch && simpleBlockMatch[1]) {
    return simpleBlockMatch[1].trim();
  }

  // Pattern 3: Strip leading/trailing ``` if present (malformed blocks)
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:python|typescript|javascript|ts|py|js)?\s*\n?/, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\n?```$/, '');
  }

  return cleaned.trim();
}
