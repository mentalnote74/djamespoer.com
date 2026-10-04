import { mkdirSync, writeFileSync } from 'node:fs';

const buildTime = new Date().toISOString();

mkdirSync('./src/app/generated', { recursive: true });

writeFileSync(
  './src/app/generated/build-info.ts',
  `// AUTO-GENERATED DURING BUILD. DO NOT EDIT.
export const BUILD_TIME = '${buildTime}';
`,
);

console.log(`Build timestamp generated: ${buildTime}`);
