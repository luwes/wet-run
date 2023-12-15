#! /usr/bin/env node

import { parseArgs } from 'node:util';
import { argv } from 'node:process';
import { realpath } from 'node:fs/promises'
import { fileURLToPath } from 'node:url';
import { cliServe } from './server.js';
import { cliRun } from './runner.js';
import { cliRelease } from './release.js';

const nodePath = await realpath(argv[1]);
const modulePath = await realpath(fileURLToPath(import.meta.url));
const isCLI = nodePath === modulePath;

if (isCLI) cli();

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

      wet run ./test/test.html --servedir . --no-headless --timeout 5000

      wet release patch --changelog --github-release
    `;

    console.log(message);
    return message;
  }

  const [task] = positionals;

  if (task === 'serve') return cliServe();
  if (task === 'run') return cliRun();
  if (task === 'release') return cliRelease();
}
