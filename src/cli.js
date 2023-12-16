#! /usr/bin/env node

import { parseArgs } from 'node:util';
import { cliServe } from './server.js';
import { cliTest } from './test.js';
import { cliRelease } from './release.js';
import { isCli } from './utils.js';

if (await isCli(import.meta.url)) cli();

export async function cli() {

  const options = {
    help: {
      type: 'boolean',
      short: 'h',
    },
  };

  const {
    values: { help },
    positionals
  } = parseArgs({ options, strict: false, allowPositionals: true });

  if (help) {
    const message = `
      Wet Run - Minimal static server, TAP test runner and conventional release flow

      wet serve . --port 8000 --cors --redirect /:/examples/

      wet test ./test/test.html --servedir . --no-headless --timeout 5000

      wet release patch --changelog --github-release
    `;

    console.log(message);
    return message;
  }

  const [task] = positionals;

  if (task === 'serve') return cliServe();
  if (task === 'test') return cliTest();
  if (task === 'release') return cliRelease();
}
