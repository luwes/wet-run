import { posix } from 'node:path';

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

/* ! The MIT License (MIT) Copyright (c) 2014 Scott Corgan */
// This is adopted from https://github.com/scottcorgan/glob-slash/
export function slashGlob(value) {
  if (value.charAt(0) === '!') {
    return '!' + normalize(value.substr(1));
  }
  return normalize(value);
}

function normalize(value) {
  return posix.normalize(posix.join('/', value));
}
