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
    prerelease: {
      type: 'string'
    },
    preid: {
      type: 'string'
    },
    tag: {
      type: 'string'
    },
    access: {
      type: 'string',
      default: 'public'
    },
    provenance: {
      type: 'boolean',
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

  let { prerelease, preid, access, tag, provenance } = opts;

  const dryRun = opts['dry-run'] ? '--dry-run' : '';

  // --prerelease expands to --preid, --tag and a `pre` prefixed bump if needed.
  if (prerelease) {
    preid ||= prerelease;
    tag ||= prerelease;

    if (['patch', 'minor', 'major'].includes(bump)) {
      bump = `pre${bump}`;
    }
  }

  if (bump === 'conventional') {
    bump = await cmd(`
      npx -p conventional-changelog-angular
          -p conventional-recommended-bump
          -c 'conventional-recommended-bump -p angular'
    `, opts);
  }

  const version = await getVersion(bump, preid, opts);
  console.log(version);

  await cmd(`npm --no-git-tag-version version ${version}`, opts);

  // Canaries don't have Git commits, Github releases or changelogs by default.
  if (prerelease !== 'canary') {
    if (opts.changelog) await commitChangelog(version, dryRun, opts);

    await cmd(`npm --force --allow-same-version version ${version} -m "chore(release): %s"`, opts);
    await cmd(`git push --follow-tags ${dryRun}`, opts);

    if (opts['github-release']) {
      // https://github.com/conventional-changelog/releaser-tools/tree/master/packages/conventional-github-releaser
      // Requires a CONVENTIONAL_GITHUB_RELEASER_TOKEN env variable
      await cmd(`npx conventional-github-releaser -p angular`, opts);
    }
  }

  // Requires NODE_AUTH_TOKEN env variable
  await cmd(`npm publish ${flag({tag})} ${flag({provenance})} ${flag({access})} ${dryRun}`, opts);
}

async function getVersion(bump, preid, opts) {
  const [, validVersion] = await resolvePair(cmd(`npx semver ${bump}`, opts));
  if (validVersion) return validVersion;

  const pkg = await getpkg();

  if (preid || bump.startsWith('pre')) {
    return getPrereleaseVersion(pkg, bump, preid, opts);
  }

  return cmd(`npx semver ${pkg.version} -i ${bump}`, opts);
}

async function getPrereleaseVersion(pkg, bump, preid, opts) {
  const stringVersions = await cmd(`npm view ${pkg.name} versions --json`, opts);
  const versions = JSON.parse(stringVersions) ?? [];

  const relevantVersions = versions.filter(v =>
    !v.includes('-')                       // e.g. 0.2.5
    || (preid && v.includes(`-${preid}.`)) // e.g. 0.2.5-beta.2
    || (!preid && /-[0-9]/.test(v))        // e.g. 0.2.5-1
  );

  const lastVersion = relevantVersions.length ? relevantVersions.pop() : pkg.version;
  return cmd(`npx semver ${lastVersion} -i ${bump} ${flag({preid})}`, opts);
}

async function commitChangelog(version, dryRun, opts) {
  const exists = !(await resolvePair(fs.promises.access('CHANGELOG.md')))[0];

  // https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-cli#quick-start
  let changelogCmd = `npx conventional-changelog-cli -p angular -i CHANGELOG.md -s`;

  if (!exists) changelogCmd += ' -r 0';

  await cmd(changelogCmd, opts);

  await cmd(`git add CHANGELOG.md ${dryRun}`, opts);
  await cmd(`git commit -m "docs(CHANGELOG): ${version}" ${dryRun}`, opts);
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

async function getpkg(key) {
  const pkg = JSON.parse(await cmd(`npm pkg get`, {}));
  return key ? pkg[key] : pkg;
}

function flag(obj) {
  const [key, value] = Object.entries(obj)[0];
  if (value === true) return `--${key}`;
  return value ? `--${key} ${value}` : '';
}
