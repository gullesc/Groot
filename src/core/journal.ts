/**
 * GROOT Learning Journal
 *
 * Captures learning explanations and insights during curriculum development.
 * Stores entries as markdown files for easy reading and version control.
 */

import * as fs from 'fs';
import * as path from 'path';
import { JournalEntry, JournalContext } from '../types';

const JOURNAL_DIR = 'docs/journal';

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

/**
 * Get the current date in YYYY-MM-DD format
 */
function getDateString(): string {
  const now = new Date();
  const parts = now.toISOString().split('T');
  return parts[0] ?? now.toISOString().substring(0, 10);
}

/**
 * Ensure the journal directory exists
 */
function ensureJournalDir(basePath: string = process.cwd()): string {
  const journalPath = path.join(basePath, JOURNAL_DIR);

  if (!fs.existsSync(journalPath)) {
    fs.mkdirSync(journalPath, { recursive: true });
  }

  return journalPath;
}

/**
 * Format a journal entry as markdown
 */
function formatEntryAsMarkdown(entry: JournalEntry): string {
  let markdown = `# ${entry.title}\n\n`;
  markdown += `*Captured: ${entry.capturedAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}*\n\n`;

  // Context section
  if (entry.context) {
    markdown += `---\n`;
    if (entry.context.phase) {
      markdown += `**Phase:** ${entry.context.phase}\n`;
    }
    if (entry.context.activity) {
      markdown += `**Activity:** ${entry.context.activity}\n`;
    }
    if (entry.context.curriculumId) {
      markdown += `**Curriculum ID:** ${entry.context.curriculumId}\n`;
    }
    markdown += `---\n\n`;
  }

  // Main content
  markdown += `## Content\n\n${entry.content}\n\n`;

  // Takeaways
  if (entry.takeaways && entry.takeaways.length > 0) {
    markdown += `## Key Takeaways\n\n`;
    entry.takeaways.forEach(takeaway => {
      markdown += `- ${takeaway}\n`;
    });
    markdown += '\n';
  }

  // Related topics
  if (entry.relatedTopics && entry.relatedTopics.length > 0) {
    markdown += `## Related Topics\n\n`;
    entry.relatedTopics.forEach(topic => {
      markdown += `- ${topic}\n`;
    });
    markdown += '\n';
  }

  return markdown;
}

/**
 * Parse a markdown file back into a JournalEntry
 */
function parseMarkdownToEntry(content: string, slug: string, filename?: string): JournalEntry {
  const lines = content.split('\n');

  // Extract title from first line
  const firstLine = lines[0] ?? '';
  const titleMatch = firstLine.match(/^#\s+(.+)$/);
  const title = titleMatch?.[1] ?? slug;

  // Try to extract date from filename first (most reliable)
  let capturedAt = new Date();
  if (filename) {
    const fileDateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    if (fileDateMatch?.[1]) {
      capturedAt = new Date(fileDateMatch[1] + 'T12:00:00');
    }
  }

  // Fall back to content date if available
  const dateMatch = content.match(/\*Captured:\s+(.+?)\*/);
  const dateStr = dateMatch?.[1];
  if (dateStr) {
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      capturedAt = parsedDate;
    }
  }

  // Extract context if present
  let context: JournalContext | undefined;
  const phaseMatch = content.match(/\*\*Phase:\*\*\s+(.+)/);
  const activityMatch = content.match(/\*\*Activity:\*\*\s+(.+)/);
  const curriculumMatch = content.match(/\*\*Curriculum ID:\*\*\s+(.+)/);

  if (phaseMatch || activityMatch || curriculumMatch) {
    context = {
      phase: phaseMatch?.[1],
      activity: activityMatch?.[1],
      curriculumId: curriculumMatch?.[1],
    };
  }

  // Extract main content
  const contentMatch = content.match(/## Content\n\n([\s\S]*?)(?=\n## |$)/);
  const mainContent = contentMatch?.[1]?.trim() ?? '';

  // Extract takeaways
  const takeawaysMatch = content.match(/## Key Takeaways\n\n([\s\S]*?)(?=\n## |$)/);
  const takeawaysContent = takeawaysMatch?.[1];
  const takeaways = takeawaysContent
    ? takeawaysContent
        .split('\n')
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2).trim())
    : undefined;

  // Extract related topics
  const relatedMatch = content.match(/## Related Topics\n\n([\s\S]*?)(?=\n## |$)/);
  const relatedContent = relatedMatch?.[1];
  const relatedTopics = relatedContent
    ? relatedContent
        .split('\n')
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2).trim())
    : undefined;

  return {
    slug,
    title,
    content: mainContent,
    capturedAt,
    context,
    takeaways,
    relatedTopics,
  };
}

/**
 * Save a new journal entry
 */
export function saveJournalEntry(
  title: string,
  content: string,
  context?: JournalContext,
  options: { basePath?: string; takeaways?: string[]; relatedTopics?: string[] } = {}
): JournalEntry {
  const journalPath = ensureJournalDir(options.basePath);
  const dateString = getDateString();
  const slug = generateSlug(title);
  const filename = `${dateString}-${slug}.md`;
  const filePath = path.join(journalPath, filename);

  const entry: JournalEntry = {
    slug,
    title,
    content,
    capturedAt: new Date(),
    context,
    takeaways: options.takeaways,
    relatedTopics: options.relatedTopics,
  };

  const markdown = formatEntryAsMarkdown(entry);
  fs.writeFileSync(filePath, markdown, 'utf-8');

  return entry;
}

/**
 * List all journal entries
 */
export function listJournalEntries(
  basePath: string = process.cwd()
): Array<{ slug: string; title: string; date: string; filePath: string }> {
  const journalPath = path.join(basePath, JOURNAL_DIR);

  if (!fs.existsSync(journalPath)) {
    return [];
  }

  const files = fs.readdirSync(journalPath)
    .filter(file => file.endsWith('.md'))
    .sort()
    .reverse(); // Most recent first

  return files.map(file => {
    const filePath = path.join(journalPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract title from first line
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1] ?? file.replace('.md', '');

    // Extract date from filename
    const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch?.[1] ?? 'unknown';

    // Extract slug from filename
    const slugMatch = file.match(/^\d{4}-\d{2}-\d{2}-(.+)\.md$/);
    const slug = slugMatch?.[1] ?? file.replace('.md', '');

    return { slug, title, date, filePath };
  });
}

/**
 * Get a specific journal entry by slug
 */
export function getJournalEntry(
  slug: string,
  basePath: string = process.cwd()
): JournalEntry | null {
  const journalPath = path.join(basePath, JOURNAL_DIR);

  if (!fs.existsSync(journalPath)) {
    return null;
  }

  // Find file matching the slug
  const files = fs.readdirSync(journalPath).filter(file => file.endsWith('.md'));

  const matchingFile = files.find(file => {
    const slugMatch = file.match(/^\d{4}-\d{2}-\d{2}-(.+)\.md$/);
    return slugMatch && slugMatch[1] === slug;
  });

  if (!matchingFile) {
    // Try partial match
    const partialMatch = files.find(file =>
      file.toLowerCase().includes(slug.toLowerCase())
    );
    if (!partialMatch) {
      return null;
    }
    const filePath = path.join(journalPath, partialMatch);
    const content = fs.readFileSync(filePath, 'utf-8');
    const extractedSlug = partialMatch.match(/^\d{4}-\d{2}-\d{2}-(.+)\.md$/)?.[1] || slug;
    return parseMarkdownToEntry(content, extractedSlug, partialMatch);
  }

  const filePath = path.join(journalPath, matchingFile);
  const content = fs.readFileSync(filePath, 'utf-8');

  return parseMarkdownToEntry(content, slug, matchingFile);
}

/**
 * Get the path to the journal directory
 */
export function getJournalPath(basePath: string = process.cwd()): string {
  return path.join(basePath, JOURNAL_DIR);
}
