#! /usr/bin/env node

import { parseArgs } from 'node:util';
import { serve } from './server.js';
import { run } from './runner.js';

const options = {
  port: {
    type: 'string',
    short: 'p',
  },
  servedir: {
    type: 'string',
  },
};

const {
  values,
  positionals,
} = parseArgs({ options, allowPositionals: true });

const [task, dir] = positionals;

if (task === 'serve') serve({ dir, ...values });
else if (task === 'run') run({ dir, ...values });
