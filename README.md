# 💦 Wet Run

Minimal static server, 
[TAP](https://testanything.org/) test runner and
[conventional](https://www.conventionalcommits.org/en/v1.0.0/) release flow
with few dependencies.

```bash
npm i -D wet-run
```

## Serve

Serve static files in current dir on port 8000.

```bash
wet serve
```

- Positional: `<path>`  
- Flags: `--port`, `--cors`, `--redirect`

## Test Run

Run tests in a real browser (playwright) on the `test/` path.

```bash
wet run
```

- Positional: `<path>`  
- Flags: `--port`, `--cors`, `--redirect`, `--servedir`, `--browser`, 
`--channel`, `--no-headless`, `--timeout`

## Release

Create a new patch release with a conventional changelog and Github release.

```bash
wet release patch --changelog --github-release
```

- Positional: `[<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease | from-git]`   
- Flags: `--pre-release`, `--preid`, `--tag`, `--access`, `--provenance`, `--changelog`, `--github-release`, `--dry-run`, `--verbose`  

### Continuous deployment (CD)

Check [cd.yml](.github/workflows/cd.yml) for an example.

- Requires [`NODE_AUTH_TOKEN`](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages#publishing-packages-to-the-npm-registry) for `npm publish`
- Requires [`CONVENTIONAL_GITHUB_RELEASER_TOKEN`](https://github.com/conventional-changelog/releaser-tools/tree/master/packages/conventional-github-releaser) for Github releases
