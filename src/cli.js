#! /usr/bin/env node

import { parseArgs } from 'node:util';
import { cliServe } from './server.js';
import { cliRun } from './runner.js';
import { cliRelease } from './release.js';

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
  console.log(`
    Wet Run - Minimal static server, TAP test runner and conventional release flow

    wet serve . --port 8000 --cors --redirect ./:./examples/

    wet run ./test/test.html --servedir . --no-headless --timeout 5000

    wet release patch --changelog --github-release
  `);
}

const [task] = positionals;

if (task === 'serve') cliServe();
else if (task === 'run') cliRun();
else if (task === 'release') cliRelease();
