/**
 * Python Project Template
 *
 * Generates Python project structure with classes and docstrings.
 */

import { TemplateDefinition, ScaffoldContext, ScaffoldFile, Deliverable } from '../types';
import { toPascalCase, toSnakeCase, generateTodoComments } from '../core/scaffold';

export const pythonTemplate: TemplateDefinition = {
  name: 'python',
  displayName: 'Python',
  description: 'Python project with classes and docstrings',
  fileExtension: '.py',

  generateFiles(context: ScaffoldContext): ScaffoldFile[] {
    const { phase } = context;
    const files: ScaffoldFile[] = [];

    // Create src directory
    files.push({ path: 'src', type: 'directory', content: '' });

    // Create requirements.txt
    files.push({
      path: 'requirements.txt',
      type: 'file',
      content: generateRequirements(),
    });

    // Create __init__.py for package
    files.push({
      path: 'src/__init__.py',
      type: 'file',
      content: generateInitFile(phase.deliverables),
    });

    // Generate file for each deliverable
    for (const deliverable of phase.deliverables) {
      files.push(generateDeliverableFile(deliverable));
    }

    // Create main.py entry point
    files.push({
      path: 'main.py',
      type: 'file',
      content: generateMainFile(phase.deliverables),
    });

    return files;
  },
};

function generateRequirements(): string {
  return `# Project dependencies
# Add your dependencies here, e.g.:
# requests>=2.28.0
# numpy>=1.24.0
`;
}

function generateInitFile(deliverables: Deliverable[]): string {
  const imports = deliverables.map(d => {
    const moduleName = toSnakeCase(d.title);
    const className = toPascalCase(d.title);
    return `from .${moduleName} import ${className}`;
  });

  const exports = deliverables.map(d => `"${toPascalCase(d.title)}"`);

  return `"""
Phase deliverables package.

This module exports all deliverable implementations.
"""

${imports.join('\n')}

__all__ = [${exports.join(', ')}]
`;
}

function generateDeliverableFile(deliverable: Deliverable): ScaffoldFile {
  const fileName = toSnakeCase(deliverable.title) + '.py';
  const className = toPascalCase(deliverable.title);

  const todos = generateTodoComments(deliverable.acceptanceCriteria, '#');

  const content = `"""
${deliverable.title}

${deliverable.description}
"""

${todos}


class ${className}:
    """
    ${className}

    Implement this class to complete the deliverable.
    """

    def __init__(self):
        """Initialize the ${className} instance."""
        # TODO: Initialize your implementation
        pass

    def execute(self) -> None:
        """
        Main entry point.

        Implement the main functionality here.
        """
        # TODO: Implement the main functionality
        raise NotImplementedError("Not implemented")


def create_${toSnakeCase(deliverable.title)}() -> ${className}:
    """
    Factory function for creating ${className} instances.

    Returns:
        ${className}: A new instance of ${className}
    """
    return ${className}()
`;

  return {
    path: `src/${fileName}`,
    type: 'file',
    content,
  };
}

function generateMainFile(deliverables: Deliverable[]): string {
  const imports = deliverables.map(d => {
    const className = toPascalCase(d.title);
    return `from src import ${className}`;
  });

  return `"""
Main entry point for the project.

Run this file to execute your implementations.
"""

${imports.join('\n')}


def main():
    """Main function."""
    print("Phase implementation started...")

    # TODO: Add your main logic here
    # Example:
    # instance = ${toPascalCase(deliverables[0]?.title || 'MyClass')}()
    # instance.execute()

    print("Done!")


if __name__ == "__main__":
    main()
`;
}
