// npm publish with goodies
// inspired by https://gist.github.com/stevemao/280ef22ee861323993a0
import * as fs from 'node:fs';
import { parseArgs } from 'node:util';
import { isCli, resolvePair, cmd } from './utils.js';

if (await isCli(import.meta.url)) cliRelease();

export function cliRelease() {

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
    'log-level': {
      type: 'string',
      default: 'info',
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
  return release(version, values);
}

export async function release(bump = 'conventional', opts) {
  let { prerelease, preid, access, tag, provenance } = opts;

  log(`Creating a ${bump}${prerelease ? ` ${prerelease}` : ''} release!`, opts);

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
      npx --yes
        -p conventional-changelog-angular@7.0.0
        -p conventional-recommended-bump@9.0.0
        -c 'conventional-recommended-bump -p angular'
    `, opts);
  }

  const version = await getVersion(bump, preid, opts);
  const pkg = await getpkg();

  if (bump !== 'from-package') {

    if (version !== pkg.version) {
      await wetCmd(`npm --no-git-tag-version version ${version}`, opts);
      log(`${version}`, opts);
    }
    else {
      log(`${version} (no change)`, opts);
    }
  }
  else {
    log(`${version} (from package)`, opts);
  }

  // Canaries don't have Git commits, Github releases or changelogs by default.
  if (prerelease !== 'canary') {
    if (opts.changelog) await commitChangelog(version, dryRun, opts);

    const gitTag = await cmd(`git tag --list v${version}`, opts);

    if (!gitTag) {
      await wetCmd(`npm --force --allow-same-version version ${version} -m "chore(release): %s"`, opts);
      await wetCmd(`git push --follow-tags ${dryRun}`, opts);
    }

    if (opts['github-release']) {
      // https://github.com/conventional-changelog/releaser-tools/tree/master/packages/conventional-github-releaser
      // Requires a CONVENTIONAL_GITHUB_RELEASER_TOKEN env variable
      try {
        await wetCmd(`npx --yes conventional-github-releaser@3.1.5 -p angular`, opts);
      } catch (err) {
        if (opts['log-level'] !== 'silent') {
          log('Failed to create a Github release', opts);
          console.error(err);
        }
      }
    }
  }

  // Requires NODE_AUTH_TOKEN env variable
  await cmd(`npm publish ${flag({tag})} ${flag({provenance})} ${flag({access})} ${dryRun}`, opts);

  return {
    version,
  };
}

export async function getVersion(bump, preid, opts) {

  if (bump === 'from-git') {
    return (await cmd(`git describe --abbrev=0 --tags`, opts)).replace(/^v/, '');
  }

  if (bump === 'from-package') {
    return (await getpkg()).version;
  }

  const [, validVersion] = await resolvePair(cmd(`npx --yes semver@7.5.4 ${bump}`, opts));
  if (validVersion) return validVersion;

  if (preid || bump.startsWith('pre')) {
    return getPrereleaseVersion(bump, preid, opts);
  }

  return semverIncrease((await getpkg()).version, bump, '', opts);
}

export async function getPrereleaseVersion(bump, preid, opts) {
  const pkg = await getpkg();
  const stringVersions = await cmd(`npm view ${pkg.name} versions --json`, opts);
  const versions = JSON.parse(stringVersions) ?? [];

  const relevantVersions = versions.filter(v =>
    !v.includes('-')                       // e.g. 0.2.5
    || (preid && v.includes(`-${preid}.`)) // e.g. 0.2.5-beta.2
    || (!preid && /-[0-9]/.test(v))        // e.g. 0.2.5-1
  );

  const lastVersion = relevantVersions.length ? relevantVersions.pop() : pkg.version;
  return semverIncrease(lastVersion, bump, flag({preid}), opts);
}

async function semverIncrease(currentVersion, bump, flags, opts) {

  if (!['major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease'].includes(bump)) {
    throw new Error(`Invalid version bump "${bump}"`);
  }
  return cmd(`npx --yes semver@7.5.4 ${currentVersion} -i ${bump} ${flags}`, opts);
}

async function commitChangelog(version, dryRun, opts) {
  const exists = !(await resolvePair(fs.promises.access('CHANGELOG.md')))[0];

  // https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-cli#quick-start
  let changelogCmd = `npx --yes conventional-changelog-cli@4.1.0 -p angular -i CHANGELOG.md -s`;

  if (!exists) changelogCmd += ' -r 0';

  await wetCmd(changelogCmd, opts);

  if (await wetCmd(`git status --porcelain CHANGELOG.md`, opts) === '') {
    log('No changes to CHANGELOG.md', opts);
    return;
  }

  // Sometimes a publish is done from a git ignored folder, so we need to force-add.
  await wetCmd(`git add --force CHANGELOG.md ${dryRun}`, opts);
  await wetCmd(`git commit -m "docs(CHANGELOG): ${version}" ${dryRun}`, opts);
}

function wetCmd(command, opts) {
  if (!opts['dry-run']) {
    return cmd(command, opts);
  }
  log(command, opts);
}

function log(msg, opts = {}) {
  if (['info', 'verbose'].includes(opts['log-level'])) {
    console.log(msg);
  }
}

async function getpkg(key) {
  const pkg = JSON.parse(await cmd(`npm pkg get --no-workspaces`, {}));
  return key ? pkg[key] : pkg;
}

function flag(obj) {
  const [key, value] = Object.entries(obj)[0];
  if (value === true) return `--${key}`;
  return value ? `--${key} ${value}` : '';
}
