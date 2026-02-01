/**
 * Vue Project Template
 *
 * Generates Vue 3 + TypeScript project structure using Vite.
 */

import { TemplateDefinition, ScaffoldContext, ScaffoldFile, Deliverable } from '../types';
import { generateFileName, toPascalCase } from '../core/scaffold';

export const vueTemplate: TemplateDefinition = {
  name: 'vue',
  displayName: 'Vue',
  description: 'Vue 3 + TypeScript project with Vite bundler',
  fileExtension: '.vue',

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

    files.push({
      path: 'env.d.ts',
      type: 'file',
      content: generateEnvDts(),
    });

    // Create main entry files
    files.push({
      path: 'src/main.ts',
      type: 'file',
      content: generateMainTs(),
    });

    files.push({
      path: 'src/App.vue',
      type: 'file',
      content: generateAppVue(phase.deliverables),
    });

    files.push({
      path: 'src/style.css',
      type: 'file',
      content: generateStyleCss(),
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
      module: 'ESNext',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'preserve',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
    },
    include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue'],
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
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
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
      build: 'vue-tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: {
      vue: '^3.3.11',
    },
    devDependencies: {
      '@vitejs/plugin-vue': '^4.5.2',
      typescript: '^5.2.2',
      vite: '^5.0.8',
      'vue-tsc': '^1.8.25',
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
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;
}

function generateEnvDts(): string {
  return `/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
`;
}

function generateMainTs(): string {
  return `import { createApp } from 'vue';
import './style.css';
import App from './App.vue';

createApp(App).mount('#app');
`;
}

function generateAppVue(deliverables: Deliverable[]): string {
  const imports = deliverables.map(d => {
    const componentName = toPascalCase(d.title);
    return `import ${componentName} from './components/${generateFileName(d.title, '.vue')}';`;
  }).join('\n');

  const components = deliverables.map(d => {
    const componentName = toPascalCase(d.title);
    return `      <${componentName} />`;
  }).join('\n');

  return `<script setup lang="ts">
${imports}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>Phase Deliverables</h1>
    </header>
    <main class="app-main">
${components}
    </main>
  </div>
</template>

<style scoped>
.app {
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
</style>
`;
}

function generateStyleCss(): string {
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
  const fileName = generateFileName(deliverable.title, '.vue');

  const todos = deliverable.acceptanceCriteria.map(c => `// TODO: ${c}`).join('\n');

  const content = `<script setup lang="ts">
/**
 * ${deliverable.title}
 *
 * ${deliverable.description}
 */

${todos}

// TODO: Define component props
interface Props {
  // Add props here
}

defineProps<Props>();

// TODO: Implement component logic
</script>

<template>
  <div class="${fileName.replace('.vue', '')}">
    <h2>${deliverable.title}</h2>
    <p>${deliverable.description}</p>
    <div class="implementation">
      <!-- TODO: Add your implementation here -->
      <p>Not yet implemented</p>
    </div>
  </div>
</template>

<style scoped>
.${fileName.replace('.vue', '')} {
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.${fileName.replace('.vue', '')} h2 {
  margin-bottom: 0.5rem;
  color: #333;
}

.${fileName.replace('.vue', '')} p {
  color: #666;
  margin-bottom: 1rem;
}

.implementation {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
}
</style>
`;

  return {
    path: `src/components/${fileName}`,
    type: 'file',
    content,
  };
}

function generateComponentsIndex(deliverables: Deliverable[]): string {
  const exports = deliverables.map(d => {
    const fileName = generateFileName(d.title, '.vue');
    const componentName = toPascalCase(d.title);
    return `export { default as ${componentName} } from './${fileName}';`;
  });

  return `/**
 * Component Exports
 *
 * This file exports all deliverable components.
 */

${exports.join('\n')}
`;
}
