# 💦 Wet Run

Minimal static server and [TAP](https://testanything.org/) test runner 
with few dependencies.

```bash
npm i -D wet-run
```

--- 

Serve static files in current dir on port 8000.

```bash
wet serve
```

- Positional: `path`  
- Flags: `--port`, `--cors`, `--redirect`

---

Run tests in a real browser (playwright) on the `test/` path.

```bash
wet run
```

- Positional: `path`  
- Flags: `--port`, `--cors`, `--redirect`, `--servedir`, `--browser`, 
`--channel`, `--no-headless`, `--timeout`

