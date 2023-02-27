# 💦 Wet Run

Minimal static server and [TAP](https://testanything.org/) test runner 
with a few dependencies instead of >100 like most others.

```bash
npm i -D wet-run
```

--- 

Serve static files in current dir on port 8000.

```bash
wet serve
```

CLI args: `--port`, `--cors`, `--redirect`

---

Run tests in a real browser (playwright) in the `test/` folder.

```bash
wet run
```

extra CLI args: `--servedir`, `--browser`, `--channel`, `--no-headless`, `--timeout`
