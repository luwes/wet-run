import { argv } from 'node:process';
import dns from 'node:dns';
import assert from 'node:assert';
import { test } from 'node:test';
import { cli } from '../src/cli.js';

dns.setDefaultResultOrder('ipv4first');

const servers = [];
const cmd = async (command) => {
  argv.length = 0;
  argv.push('', ...command.split(/\s+/g));
  const out = await cli();
  if (out?.server) servers.push(out.server);
  return out;
}

await test('wet --help', async (t) => {
  const out = await cmd(t.name);
  assert.match(out, /Wet Run -/);
});

await test('wet serve --port 8181', async (t) => {
  const { port } = await cmd(t.name);
  assert.equal(port, '8181');
});

await test('wet release patch --dry-run --changelog --github-release', async (t) => {
  await cmd(t.name);
  assert(true);
});

await test('wet release minor --dry-run --prerelease canary', async (t) => {
  await cmd(t.name);
  assert(true);
});

await test('wet run --coverage', async (t) => {
  await cmd(t.name);
  assert(true);
});

await new Promise((resolve) => setTimeout(resolve, 10));

for (const server of servers) {
  server.close();
  server.closeAllConnections();
}
