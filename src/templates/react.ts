/**
 * React Project Template
 *
 * Generates React + TypeScript project structure using Vite.
 */

import { TemplateDefinition, ScaffoldContext, ScaffoldFile, Deliverable } from '../types';
import { generateFileName, toPascalCase, generateTodoComments } from '../core/scaffold';

export const reactTemplate: TemplateDefinition = {
  name: 'react',
  displayName: 'React',
  description: 'React + TypeScript project with Vite bundler',
  fileExtension: '.tsx',

  generateFiles(context: ScaffoldContext): ScaffoldFile[] {
    const { phase } = context;
    const files: ScaffoldFile[] = [];

    // Create directories
    files.push({ path: 'src', type: 'directory', content: '' });
    files.push({ path: 'src/components', type: 'directory', content: '' });
    files.push({ path: 'public', type: 'directory', content: '' });

    // Create config files
    files.push({
      path: 'tsconfig.json',
      type: 'file',
      content: generateTsConfig(),
    });

    files.push({
      path: 'tsconfig.node.json',
      type: 'file',
      content: generateTsConfigNode(),
    });

    files.push({
      path: 'vite.config.ts',
      type: 'file',
      content: generateViteConfig(),
    });

    files.push({
      path: 'package.json',
      type: 'file',
      content: generatePackageJson(context),
    });

    files.push({
      path: 'index.html',
      type: 'file',
      content: generateIndexHtml(context),
    });

    // Create main entry files
    files.push({
      path: 'src/main.tsx',
      type: 'file',
      content: generateMainTsx(),
    });

    files.push({
      path: 'src/App.tsx',
      type: 'file',
      content: generateAppTsx(phase.deliverables),
    });

    files.push({
      path: 'src/App.css',
      type: 'file',
      content: generateAppCss(),
    });

    files.push({
      path: 'src/index.css',
      type: 'file',
      content: generateIndexCss(),
    });

    files.push({
      path: 'src/vite-env.d.ts',
      type: 'file',
      content: '/// <reference types="vite/client" />\n',
    });

    // Generate component for each deliverable
    for (const deliverable of phase.deliverables) {
      files.push(generateComponentFile(deliverable));
    }

    // Create components index
    files.push({
      path: 'src/components/index.ts',
      type: 'file',
      content: generateComponentsIndex(phase.deliverables),
    });

    return files;
  },
};

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
    },
    include: ['src'],
    references: [{ path: './tsconfig.node.json' }],
  }, null, 2);
}

function generateTsConfigNode(): string {
  return JSON.stringify({
    compilerOptions: {
      composite: true,
      skipLibCheck: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowSyntheticDefaultImports: true,
      strict: true,
    },
    include: ['vite.config.ts'],
  }, null, 2);
}

function generateViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
});
`;
}

function generatePackageJson(context: ScaffoldContext): string {
  const { curriculum, phase } = context;
  const name = curriculum.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return JSON.stringify({
    name: `${name}-phase-${phase.number}`,
    private: true,
    version: '0.1.0',
    description: phase.description,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    },
    devDependencies: {
      '@types/react': '^18.2.43',
      '@types/react-dom': '^18.2.17',
      '@vitejs/plugin-react': '^4.2.1',
      typescript: '^5.2.2',
      vite: '^5.0.8',
    },
  }, null, 2);
}

function generateIndexHtml(context: ScaffoldContext): string {
  const { phase } = context;
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${phase.title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function generateMainTsx(): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;
}

function generateAppTsx(deliverables: Deliverable[]): string {
  const imports = deliverables.map(d => {
    const componentName = toPascalCase(d.title);
    return `import { ${componentName} } from './components';`;
  }).join('\n');

  const components = deliverables.map(d => {
    const componentName = toPascalCase(d.title);
    return `        <${componentName} />`;
  }).join('\n');

  return `import './App.css';
${imports}

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Phase Deliverables</h1>
      </header>
      <main className="app-main">
${components}
      </main>
    </div>
  );
}

export default App;
`;
}

function generateAppCss(): string {
  return `.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.app-header {
  text-align: center;
  margin-bottom: 2rem;
}

.app-header h1 {
  color: #333;
  font-size: 2rem;
}

.app-main {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
`;
}

function generateIndexCss(): string {
  return `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color: #213547;
  background-color: #ffffff;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  min-width: 320px;
  min-height: 100vh;
}
`;
}

function generateComponentFile(deliverable: Deliverable): ScaffoldFile {
  const fileName = generateFileName(deliverable.title, '.tsx');
  const componentName = toPascalCase(deliverable.title);

  const todos = generateTodoComments(deliverable.acceptanceCriteria, '//');

  const content = `/**
 * ${deliverable.title}
 *
 * ${deliverable.description}
 */

import React from 'react';

${todos}

interface ${componentName}Props {
  // TODO: Define component props
}

/**
 * ${componentName} Component
 *
 * Implement this component to complete the deliverable.
 */
export function ${componentName}(props: ${componentName}Props): React.ReactElement {
  // TODO: Implement the component
  return (
    <div className="${fileName.replace('.tsx', '')}">
      <h2>${deliverable.title}</h2>
      <p>${deliverable.description}</p>
      <div className="implementation">
        {/* TODO: Add your implementation here */}
        <p>Not yet implemented</p>
      </div>
    </div>
  );
}

export default ${componentName};
`;

  return {
    path: `src/components/${fileName}`,
    type: 'file',
    content,
  };
}

function generateComponentsIndex(deliverables: Deliverable[]): string {
  const exports = deliverables.map(d => {
    const fileName = generateFileName(d.title, '');
    const componentName = toPascalCase(d.title);
    return `export { ${componentName} } from './${fileName}';`;
  });

  return `/**
 * Component Exports
 *
 * This file exports all deliverable components.
 */

${exports.join('\n')}
`;
}
