import { argv } from 'node:process';
import { realpath } from 'node:fs/promises'
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import child_process from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(child_process.exec);

export async function isCli(metaUrl) {
  const nodePath = await realpath(argv[1]);
  const modulePath = await realpath(fileURLToPath(metaUrl));
  return nodePath === modulePath;
}

export async function getFreePort(base = 8000) {
  for (let port = base; port < base + 10; port++) {
    if (await isPortAvailable(port)) return port;
  }
}

export function isPortAvailable(port) {
  return new Promise((resolve) => {
    let socket = new net.Socket();
    socket.on('connect', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(true);
    });
    socket.on('timeout', () => {
      resolve(true);
    });
    socket.setTimeout(100);
    socket.connect(port, '0.0.0.0');
    socket.unref();
  });
}

export async function cmd(command, opts) {
  command = command.trim().replace(/\s+/g, ' ');

  if (opts.verbose) console.log(`${command}`);

  const { stdout, stderr } = await exec(command);

  if (stderr) {
    console.error(`\n${stderr}`);
  }

  return stdout.trim();
}

export function sizeToString(stats, humanReadable, si) {
  if (stats.isDirectory && stats.isDirectory()) {
    return '';
  }

  let bytes = stats.size;
  const threshold = si ? 1000 : 1024;

  if (!humanReadable || bytes < threshold) {
    return `${bytes}B`;
  }

  const units = ['k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
  let u = -1;
  do {
    bytes /= threshold;
    u += 1;
  } while (bytes >= threshold);

  let b = bytes.toFixed(1);
  if (isNaN(b)) b = '??';

  return b + units[u];
}

export function lastModifiedToString(stats) {
  const t = new Date(stats.mtime);
  return (('0' + (t.getDate())).slice(-2) + '-' +
          t.toLocaleString('default', { month: 'short' }) + '-' +
          t.getFullYear() + ' ' +
          ('0' + t.getHours()).slice(-2) + ':' +
          ('0' + t.getMinutes()).slice(-2));
}

export async function resolvePair(promiseLike) {
  try {
    const data = await promiseLike;
    return [undefined, data];
  } catch (error) {
    return [error, undefined];
  }
}
