import process from 'node:process';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import playwright from 'playwright-core';
import { serve } from './server.js';
import { cmd } from './utils.js';

const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
const isRunningDirectlyViaCLI = nodePath === modulePath;

if (isRunningDirectlyViaCLI) cliRun();

export async function cliRun() {

  const options = {
    coverage: {
      type: 'boolean',
    },
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
    servedir,
    coverage,
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

    if (coverage) {
      await page.coverage.startJSCoverage();
    }

    let prefix = '\n';
    page.on('console', async event => {
      const msg = event.text();

      console.log(`${prefix}${msg}`);
      prefix = '';

      const match = msg.match(/^# fail +(\d+)$/);
      if (match) {
        if (match[1] == 0) {
          if (files.length === 0) {

            if (coverage) {
              const report = await page.coverage.stopJSCoverage();
              await createCoverageReports(report, url, opts);
            }

            process.exit(0);
          }
          else {
            page.goto(`${url}/${files.shift()}`);
          }
        } else {
          // If there is a failed test, exit with error.
          process.exit(1);
        }
      }
    });

    await page.goto(`${url}/${files.shift()}`);
    await page.waitForTimeout(+timeout);

    process.exit(2);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

async function createCoverageReports(report, url, opts) {

  const reportWithPath = report
    .filter((entry) => {
      const { pathname } = new URL(entry.url);
      return entry.url.startsWith(url)
        && !pathname.startsWith('/node_modules/')
        && !pathname.startsWith('/test/');
    })
    .map((entry) => {
      const { pathname } = new URL(entry.url);
      return {
        ...entry,
        url: `file://${path.join(process.cwd(), pathname)}`
      };
    })

  await mkdir('coverage/tmp/', { recursive: true });
  await writeFile(
    'coverage/tmp/coverage.json',
    JSON.stringify({ result: reportWithPath }, null, 2)
  );

  const table = await cmd(`npx -y c8@8.0.1 report`, opts);
  console.log(`\n${table}`);

  await cmd(`npx -y c8@8.0.1 report --reporter=text-lcov > ./coverage/lcov.info`, opts);
}
