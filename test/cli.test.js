import { argv } from 'node:process';
import dns from 'node:dns';
import assert from 'node:assert';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises'
import { cli } from '../src/cli.js';
import { getPrereleaseVersion, getLastVersion } from '../src/release.js';
import { cmd } from '../src/utils.js';

dns.setDefaultResultOrder('ipv4first');

const servers = [];
const cliCmd = async (command) => {
  argv.length = 0;
  argv.push('', ...command.split(/\s+/g));
  await setTimeout(0);
  console.log('-------------------------\n');
  const out = await cli();
  if (out?.server) servers.push(out.server);
  return out;
}

const versions = [
  '0.2.4',
  '0.2.3',
  '0.2.5-beta.2',
  '0.2.5-beta.2-c771934',
  '0.2.5-beta.101',
  '0.2.5-beta.100',
  '0.2.5-beta.99-c771934',
  '0.2.4-beta.200',
  '0.3.0-canary.0',
];

await test('getLastVersion', async () => {
  const lastVersion = getLastVersion(versions);
  assert.equal(lastVersion, '0.2.4');
});

await test('getLastVersion preid', async () => {
  const lastVersion = getLastVersion(versions, 'beta');
  assert.equal(lastVersion, '0.2.5-beta.101');
});

await test('wet --help', async (t) => {
  const out = await cliCmd(t.name);
  assert.match(out, /Wet Run -/);
});

await test('wet serve --port 8181', async (t) => {
  const { port } = await cliCmd(t.name);
  assert.equal(port, '8181');
});

await test('wet release patch --dry-run --changelog --github-release', async (t) => {
  const { version } = await cliCmd(t.name);
  const pkgVersion = (await cmd('npm pkg get version', {})).slice(1, -1);
  const newVersion = await cmd(`npx --yes semver@7.5.4 ${pkgVersion} -i patch`, {});
  assert.equal(version, newVersion);
});

await test('wet release preminor --dry-run --prerelease canary', async (t) => {
  const { version } = await cliCmd(t.name);
  const newVersion = await getPrereleaseVersion('preminor', 'canary', {});
  assert.equal(version, newVersion);
});

await test('wet release from-package --dry-run', async (t) => {
  const { version } = await cliCmd(t.name);
  const pkgVersion = (await cmd('npm pkg get version', {})).slice(1, -1);
  assert.equal(version, pkgVersion);
});

await test('wet test --coverage', async (t) => {
  await cliCmd(t.name);
  assert(true);
});

await setTimeout(0);

for (const server of servers) {
  server.close();
  server.closeAllConnections();
}
