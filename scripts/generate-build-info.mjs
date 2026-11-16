import { mkdirSync, writeFileSync } from 'node:fs';
import { releaseIdentity } from './release/identity.mjs';

const identity = releaseIdentity();
// Only main builds are releases; a branch or local build must not claim a release number.
const release = {
  ...identity,
  version: identity.channel === 'production' ? identity.version : null,
};

mkdirSync('./src/app/generated', { recursive: true });

writeFileSync(
  './src/app/generated/build-info.ts',
  `// AUTO-GENERATED DURING BUILD. DO NOT EDIT.
export const BUILD_TIME = '${release.builtAt}';
export const BUILD_VERSION: string | null = ${JSON.stringify(release.version)};
export const BUILD_COMMIT = '${release.shortCommit}';
export const BUILD_CHANNEL: 'production' | 'preview' | 'local' = '${release.channel}';
`,
);

// Machine-readable identity of the live build, matched by git tag v<version>.
writeFileSync(
  './public/version.json',
  JSON.stringify({ schemaVersion: 1, ...release }, null, 2) + '\n',
);

console.log(
  `Build ${release.version ?? '(unversioned)'} ${release.shortCommit} [${release.channel}] at ${release.builtAt}`,
);
