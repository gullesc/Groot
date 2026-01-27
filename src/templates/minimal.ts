/**
 * Minimal Template
 *
 * Generates only README and OBJECTIVES files with folder structure.
 * No code stubs - ideal for non-coding curricula or architecture studies.
 */

import { TemplateDefinition, ScaffoldContext, ScaffoldFile } from '../types';
import { generateFileName } from '../core/scaffold';

export const minimalTemplate: TemplateDefinition = {
  name: 'minimal',
  displayName: 'Minimal',
  description: 'README and OBJECTIVES only - no code stubs',
  fileExtension: '',

  generateFiles(context: ScaffoldContext): ScaffoldFile[] {
    const { phase } = context;
    const files: ScaffoldFile[] = [];

    // Create docs directory for additional notes
    files.push({ path: 'docs', type: 'directory', content: '' });

    // Create a folder for each deliverable
    for (const deliverable of phase.deliverables) {
      const folderName = generateFileName(deliverable.title, '');
      files.push({
        path: folderName,
        type: 'directory',
        content: '',
      });

      // Add a notes file in each deliverable folder
      files.push({
        path: `${folderName}/NOTES.md`,
        type: 'file',
        content: generateDeliverableNotes(deliverable.title, deliverable.description, deliverable.acceptanceCriteria),
      });
    }

    return files;
  },
};

function generateDeliverableNotes(
  title: string,
  description: string,
  acceptanceCriteria: string[]
): string {
  return `# ${title}

${description}

## Acceptance Criteria

${acceptanceCriteria.map(c => `- [ ] ${c}`).join('\n')}

## Research Notes

_Add your research and findings here..._

## Key Insights

_Document important learnings..._

## Resources

_List helpful resources, articles, or documentation..._

-
`;
}
