// npm publish with goodies
// inspired by https://gist.github.com/stevemao/280ef22ee861323993a0
import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import child_process from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';

const exec = promisify(child_process.exec);
const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
const isRunningDirectlyViaCLI = nodePath === modulePath;

if (isRunningDirectlyViaCLI) cliRelease();

export async function cliRelease() {

  const options = {
    'pre-release': {
      type: 'string'
    },
    preid: {
      type: 'string'
    },
    tag: {
      type: 'string'
    },
    changelog: {
      type: 'boolean',
    },
    'github-release': {
      type: 'boolean',
    },
    'dry-run': {
      type: 'boolean',
    },
    verbose: {
      type: 'boolean',
    },
  };

  const {
    values,
    positionals,
  } = parseArgs({
    options,
    allowPositionals: true
  });

  let [, version] = positionals;
  await release(version, values);
}

export async function release(bump = 'conventional', opts) {
  console.log(`Creating a "${bump}" release!`);

  const dryRun = opts['dry-run'] ? '--dry-run' : '';
  const preRelease = opts['pre-release'];
  let { preid, tag } = opts;

  if (bump === 'conventional') {
    bump = await cmd(`
      npx -p conventional-changelog-angular
          -p conventional-recommended-bump
          -c 'conventional-recommended-bump -p angular'
    `, opts);
  }

  if (preRelease) {
    preid ||= preRelease;
    tag ||= preRelease;

    if (['patch', 'minor', 'major'].includes(bump)) {
      bump = `pre${bump}`;
    }
  }

  if (preid) bump += ` --preid ${preid}`;

  const version = await cmd(`npm --no-git-tag-version version ${bump}`, cmd);
  console.log(version);

  // Turn off changelogs for a canary.
  if (opts.changelog && preRelease !== 'canary') {
    const exists = !(await resolvePair(fs.promises.access('CHANGELOG.md')))[0];

    // https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-cli#quick-start
    let changelogCmd = `npx conventional-changelog-cli -p angular -i CHANGELOG.md -s`;

    if (!exists) changelogCmd += ' -r 0';

    await cmd(changelogCmd, opts);

    await cmd(`git add CHANGELOG.md ${dryRun}`, opts);
    await cmd(`git commit -m "docs(CHANGELOG): ${version}" ${dryRun}`, opts);
  }

  await cmd(`npm --force --allow-same-version version ${version} -m "chore(release): %s"`, opts);
  await cmd(`git push --follow-tags ${dryRun}`, opts);

  // Turn off Github releases for a canary.
  if (opts['github-release'] && preRelease !== 'canary') {
    // https://github.com/conventional-changelog/releaser-tools/tree/master/packages/conventional-github-releaser
    // Requires a CONVENTIONAL_GITHUB_RELEASER_TOKEN env variable
    await cmd(`npx conventional-github-releaser -p angular`, opts);
  }

  tag = tag ? `--tag ${tag}` : '';

  // Requires NODE_AUTH_TOKEN env variable
  await cmd(`npm publish ${tag} ${dryRun}`, opts);
}

async function cmd(command, opts) {
  command = command.trim().replace(/\s+/g, ' ');

  if (opts.verbose) console.log(`${command}`);

  const { stdout, stderr } = await exec(command);

  if (stderr) {
    console.error(`\n${stderr}`);
  }

  return stdout.trim();
}

async function resolvePair(promiseLike) {
  try {
    const data = await promiseLike;
    return [undefined, data];
  } catch (error) {
    return [error, undefined];
  }
}
