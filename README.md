# 💦 Wet Run

[![npm version](https://img.shields.io/npm/v/wet-run?style=flat-square&color=success)](http://npmjs.org/wet-run) 
[![Codecov](https://img.shields.io/codecov/c/github/luwes/wet-run?style=flat-square)](https://app.codecov.io/gh/luwes/wet-run)


Minimal static server, 
[TAP](https://testanything.org/) test runner and
[conventional](https://www.conventionalcommits.org/en/v1.0.0/) release flow
with few dependencies.

```bash
npm i -D wet-run
```

## Serve

Serve static files in current dir on port 8000. (powered by 🔥 [Hono](https://github.com/honojs/hono))

```bash
wet serve
```

- Positional: `<path>`  
- Flags: `--port`, `--cors`, `--redirect`, `--livereload`, `--ssl-cert`,
`--ssl-key`, `--ssl-pass`

## Test Run

Run tests in a real browser on the `test/` path. (powered by 🎭 [Playwright](https://github.com/microsoft/playwright/))

```bash
wet test
```

- Positional: `<path>`  
- Flags: `--port`, `--cors`, `--redirect`, `--servedir`, `--browser`, 
`--channel`, `--no-headless`, `--timeout`, `--coverage`

## Release

Create a new patch release with a conventional changelog and Github release.

```bash
wet release patch --changelog --github-release
```

- Positional: `[<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease | from-git]`   
- Flags: `--prerelease`, `--preid`, `--tag`, `--access`, `--provenance`, `--changelog`, `--github-release`, `--dry-run`, `--verbose`  

### Continuous deployment (CD)

Check [cd.yml](.github/workflows/cd.yml) for an example.

- Requires [`NODE_AUTH_TOKEN`](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages#publishing-packages-to-the-npm-registry) for `npm publish`
- Requires [`CONVENTIONAL_GITHUB_RELEASER_TOKEN`](https://github.com/conventional-changelog/releaser-tools/tree/master/packages/conventional-github-releaser) for Github releases
