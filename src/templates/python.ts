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

    // Create directories
    files.push({ path: 'src', type: 'directory', content: '' });
    files.push({ path: 'tests', type: 'directory', content: '' });

    // Create requirements.txt
    files.push({
      path: 'requirements.txt',
      type: 'file',
      content: generateRequirements(),
    });

    // Create pytest.ini
    files.push({
      path: 'pytest.ini',
      type: 'file',
      content: generatePytestConfig(),
    });

    // Create __init__.py for packages
    files.push({
      path: 'src/__init__.py',
      type: 'file',
      content: generateInitFile(phase.deliverables),
    });

    files.push({
      path: 'tests/__init__.py',
      type: 'file',
      content: '# Test package\n',
    });

    // Generate source and test files for each deliverable
    for (const deliverable of phase.deliverables) {
      files.push(generateDeliverableFile(deliverable));
      files.push(generateTestFile(deliverable));
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

# Testing
pytest>=7.4.0
pytest-cov>=4.1.0
`;
}

function generatePytestConfig(): string {
  return `[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
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

function generateTestFile(deliverable: Deliverable): ScaffoldFile {
  const moduleName = toSnakeCase(deliverable.title);
  const className = toPascalCase(deliverable.title);
  const fileName = `test_${moduleName}.py`;

  // Generate test cases from acceptance criteria (skipped until implemented)
  const testCases = deliverable.acceptanceCriteria.map((criterion) => {
    const testName = toSnakeCase(criterion.slice(0, 50));
    return `    @pytest.mark.skip(reason="TODO: Implement test")
    def test_${testName}(self, instance):
        """Test: ${criterion}"""
        # TODO: Implement test for: ${criterion}
        pass`;
  }).join('\n\n');

  const content = `"""
Tests for ${deliverable.title}

Run: pytest
Watch: pytest-watch (install with: pip install pytest-watch)
Coverage: pytest --cov=src
"""

import pytest
from src.${moduleName} import ${className}, create_${moduleName}


class Test${className}:
    """Test suite for ${className}."""

    @pytest.fixture
    def instance(self):
        """Create a fresh instance for each test."""
        return create_${moduleName}()

    def test_create_instance(self, instance):
        """Test that we can create an instance."""
        assert instance is not None
        assert isinstance(instance, ${className})

    def test_execute_not_implemented(self, instance):
        """Test that execute raises NotImplementedError before implementation."""
        # TODO: Update this test once execute() is implemented
        with pytest.raises(NotImplementedError):
            instance.execute()


class TestAcceptanceCriteria:
    """Tests for acceptance criteria."""

    @pytest.fixture
    def instance(self):
        """Create a fresh instance for each test."""
        return create_${moduleName}()

${testCases}
`;

  return {
    path: `tests/${fileName}`,
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
