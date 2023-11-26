import { posix, sep } from 'node:path';

/* ! The MIT License (MIT) Copyright (c) 2013–2016 Domenic Denicola */
// https://github.com/domenic/path-is-inside
export function isPathInside(thePath, potentialParent) {
  // For inside-directory checking, we want to allow trailing slashes, so normalize.
  thePath = stripTrailingSep(thePath);
  potentialParent = stripTrailingSep(potentialParent);

  // Node treats only Windows as case-insensitive in its path module; we follow those conventions.
  if (process.platform === 'win32') {
    thePath = thePath.toLowerCase();
    potentialParent = potentialParent.toLowerCase();
  }

  return thePath.lastIndexOf(potentialParent, 0) === 0 &&
  (
    thePath[potentialParent.length] === sep ||
    thePath[potentialParent.length] === undefined
  );
};

function stripTrailingSep(thePath) {
  if (thePath[thePath.length - 1] === sep) {
    return thePath.slice(0, -1);
  }
  return thePath;
}

/* ! The MIT License (MIT) Copyright (c) 2014 Scott Corgan */
// https://github.com/scottcorgan/glob-slash/
export function slashGlob(value) {
  if (value.charAt(0) === '!') {
    return '!' + normalize(value.substr(1));
  }
  return normalize(value);
}

function normalize(value) {
  return posix.normalize(posix.join('/', value));
}

export function html(strings, ...values) {
  return String.raw(strings, ...values.map(v => {
    if (Array.isArray(v)) {
      return v.join('');
    } else {
      return escape(v);
    }
  }));
}

export function escape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function sizeToString(bytes, humanReadable, si) {
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
