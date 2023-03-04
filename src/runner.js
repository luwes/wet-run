import process from 'node:process';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import playwright from 'playwright-core';
import { serve } from './server.js';

const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
const isRunningDirectlyViaCLI = nodePath === modulePath;

if (isRunningDirectlyViaCLI) cliRun();

export async function cliRun() {

  const options = {
    port: {
      type: 'string',
      short: 'p',
    },
    cors: {
      type: 'boolean',
      short: 'C',
    },
    redirect: {
      type: 'string',
      multiple: true,
    },
    servedir: {
      type: 'string',
    },
    browser: {
      type: 'string',
    },
    channel: {
      type: 'string',
    },
    'no-headless': {
      type: 'boolean'
    },
    timeout: {
      type: 'string',
    },
  };

  const {
    values,
    positionals,
  } = parseArgs({
    options,
    allowPositionals: true
  });

  const files = positionals.slice(1);
  await run(files, values);
}

export async function run(files, opts) {

  if (!files?.[0]) files = ['test/'];

  const {
    browser = 'chromium',
    channel = 'chrome',
    timeout = 10000,
    port,
    cors,
    servedir
  } = opts;

  const channels = {
    chromium: channel
  };

  try {
    const { url } = await serve(servedir, { port, cors });

    const brow = await playwright[browser].launch({
      channel: channels[browser],
      headless: !opts['no-headless'],
    });

    const page = await brow.newPage();

    page.on('console', event => {
      const msg = event.text();
      console.log(msg);

      const match = msg.match(/^# fail +(\d+)$/);
      if (match) {
        if (match[1] == 0) process.exit(0);
        else process.exit(1);
      }
    });

    await Promise.all(files.map(file => page.goto(`${url}/${file}`)));
    await page.waitForTimeout(+timeout);

    process.exit(2);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
