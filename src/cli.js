#! /usr/bin/env node

import { parseArgs } from 'node:util';
import { serve } from './server.js';
import { run } from './runner.js';

const options = {
  help: {
    type: 'boolean',
    short: 'h',
  },
};

const {
  values: { help },
  positionals
} = parseArgs({ options, allowPositionals: true });

if (help) {
  console.log(`
    Wet Run - Minimal static server and TAP test runner

    wet serve . --port 8000 --cors --redirect ./:./examples/

    wet run ./test/test.html --servedir . --no-headless --timeout 5000
  `);
}

const [task] = positionals;

if (task === 'serve') serve();
else if (task === 'run') run();
