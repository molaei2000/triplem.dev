---
title: "Node.js 26.11: --process-timeout, non-throwing header validators and a stable process.ref"
description: "Node.js 26.11.0 adds --process-timeout, http.isValidHeaderName and isValidHeaderValue, and graduates process.ref/unref. What matters for SSR servers, CI and containers."
date: 2026-10-10
cover: /images/blog/2026-10-10-node-26-11-process-timeout.svg
tags: [node, tooling, ci]
draft: false
---

Node.js 26.11.0 landed on October 7 on the Current line. It is a minor release, so there is no single headline feature, but three of its changes touch things front-end teams run every day: a hard wall-clock limit for the whole process, header validators that return booleans instead of throwing, and a stable `process.ref()`/`process.unref()`. A follow-up 26.11.1 shipped the same day. By its commit list it only reverts a documentation-redesign build change and two tooling commits, so the runtime is the same as in 26.11.0 ([26.11.1 notes](https://nodejs.org/en/blog/release/v26.11.1)).

This is the Current line, not LTS. The blog index lists 22.23.3 as the latest 22.x LTS and shows v24.21.0 as the latest LTS in its header ([Node.js blog](https://nodejs.org/en/blog)). Treat everything below as something to try in CI and local tooling first.

## `--process-timeout`: a deadline for the whole process

The flag is new in v26.11.0 and documented at stability 1.1 (active development) ([CLI docs](https://nodejs.org/api/cli.html)). You give it a positive integer with a unit (`ms`, `s`, `m` or `h`):

```bash
node --process-timeout=5m scripts/prerender.mjs
```

If the process is still alive when the deadline passes, Node exits with code `124`, the same code `timeout(1)` uses. The clock starts at process start, not when the event loop goes idle.

What makes it more useful than a shell `timeout` wrapper is the diagnostics. On expiry Node writes to stderr either the resources that are keeping the event loop alive (the docs' example lists a listening TCP server and pending timers) or, if the main thread is busy, the JavaScript stack it is stuck in. Coverage from `NODE_V8_COVERAGE` and `--cpu-prof` output are still written. If the main thread does not respond within two seconds, for instance because it is blocked in `child_process.execSync()`, Node exits at once and prints neither.

Details worth knowing before you rely on it:

- `'beforeExit'` and `'exit'` handlers do not run. The reasoning in the docs is that your own JavaScript may be what is keeping the process alive. Do not count on cleanup hooks.
- `--report-on-process-timeout` adds a diagnostic report, and requires `--process-timeout`.
- It is not allowed in `NODE_OPTIONS`, and it cannot be combined with the inspector flags, `node inspect`, `--run` or `--build-snapshot`. While it is active, `inspector.open()` throws and `SIGUSR1` inspector requests are ignored.
- Child processes that inherit `process.execArgv` (for example via `child_process.fork()`) get their own timer from their own start.
- With `--watch` the timeout applies per application run, not to the watcher. With the test runner, the runner applies it to the whole run, and each test file that runs in its own process gets it too.

### Where it fits in a front-end pipeline

The obvious targets are scripts that can hang on an open handle: prerender or sitemap scripts, content indexing, visual-regression runners, and one-off migration scripts in CI. A hung job otherwise runs until the CI runner's own timeout and tells you nothing. With the flag you get a fast failure and a list of the handles that kept it alive.

```jsonc
// package.json
{
    "scripts": {
        "prerender": "node --process-timeout=10m scripts/prerender.mjs"
    }
}
```

The restriction on `NODE_OPTIONS` is a real trade-off: you cannot set a global default for every Node process in a job. It has to be on each command line, which also means it will not reach tools that spawn Node themselves unless they pass `execArgv` through.

Do not put it on a long-running production server. The deadline is for the whole process and there is no graceful shutdown path, so it is a tool for bounded jobs, not for recycling workers.

## `http.isValidHeaderName` and `http.isValidHeaderValue`

Both functions are new in v26.11.0 ([HTTP docs](https://nodejs.org/api/http.html)). `http.validateHeaderName()` and `http.validateHeaderValue()` have existed since v14.3.0 and throw a `TypeError` on bad input. The new pair performs the same check but returns a boolean, which the docs describe as suited to hot paths where invalid input is expected.

```ts
import { isValidHeaderName, isValidHeaderValue } from "node:http";

function copyForwardedHeaders(input: Record<string, unknown>, out: Headers) {
    for (const [name, value] of Object.entries(input)) {
        if (!isValidHeaderName(name) || !isValidHeaderValue(value)) continue;
        out.set(name, String(value));
    }
}
```

Behaviours from the docs that matter in that kind of code:

- `isValidHeaderName` accepts only non-empty strings that are HTTP tokens. `''`, `'bad header'` and `42` are all `false`. Because HTTP methods are tokens too, it can validate those.
- `isValidHeaderValue` returns `false` for `undefined`, symbols, and strings containing CR/LF or control characters like `\x01`. Other non-strings are coerced to strings first, as `setHeader()` does, so `123` is valid.
- It takes an `httpValidation` option, `'strict'` (default) or `'relaxed'`, with the same meaning as in `http.createServer()` and `http.request()`. In the docs' example, `'a\x01b'` is invalid in strict mode and valid in relaxed mode. An invalid `options` argument throws.

The practical use is at boundaries where you build headers from data you do not control: proxy and BFF routes that forward upstream headers, handlers that echo a query parameter into `Location` or `Set-Cookie`, or code that sets headers on a non-Node response object. In those places a try/catch per header is noisy, and an unvalidated CR/LF is a response-splitting bug. The docs also say you do not need to validate before calling `setHeader()` on the `http` module's own objects, since those validate automatically, so the new functions are for everything else.

## `process.ref()` and `process.unref()` are no longer experimental

These have existed since v23.6.0 and v22.14.0; as of v26.11.0 the docs say they are no longer experimental ([process docs](https://nodejs.org/api/process.html)). They work through a "refable" protocol: an object implements methods keyed by `Symbol.for('nodejs.ref')` and `Symbol.for('nodejs.unref')`, and `process.ref(obj)` / `process.unref(obj)` call them.

```ts
import { ref, unref } from "node:process";

const handle = {
    [Symbol.for("nodejs.ref")]() {
        /* keep the event loop alive */
    },
    [Symbol.for("nodejs.unref")]() {
        /* let the process exit */
    },
};

unref(handle);
```

The docs give the reason: calling `.ref()` and `.unref()` directly on objects is being deprecated in favour of this protocol, because Web Platform API types cannot grow those methods. For app code this changes little today. It matters for library and runtime authors who hold background timers or sockets, such as telemetry flushers or cache sweepers, and want one way to say "do not keep the process alive for this" that also works with web-standard objects. The code sample above is illustrative and not from the docs.

## Smaller items

From the release's notable-changes list ([26.11.0 notes](https://nodejs.org/en/blog/release/v26.11.0)):

- `Buffer.stringLength()` and `buffer.isLatin1` were added.
- An `http2` `connectionWindowSize` option was added.
- `perf_hooks` got fixes for `monitorEventLoopDelay()` resolution truncation, plus `histogram.diff()` and `histogram.snapshot()`. If you track event-loop lag in an SSR server, these are the ones to read up on.
- Alpine Linux was promoted to tier 2 support, relevant if you ship Nuxt or Next.js in Alpine containers.
- OpenSSL moved to 3.5.9 per the commit list, which the page does not call out as a security fix.

## Should you upgrade?

Not on production because of this release alone: it is the Current line, and nothing here is a fix you are waiting for. What is worth doing now is trying `--process-timeout` on the build and script steps that have hung before. It is cheap, it fails fast, and its output tells you what was holding the process open. Because it is stability 1.1, pin your Node version in CI and re-read the CLI docs when you bump it.

## Sources

- [Node.js blog index](https://nodejs.org/en/blog)
- [Node.js 26.11.0 release notes](https://nodejs.org/en/blog/release/v26.11.0)
- [Node.js 26.11.1 release notes](https://nodejs.org/en/blog/release/v26.11.1)
- [Node.js HTTP API docs](https://nodejs.org/api/http.html)
- [Node.js CLI docs](https://nodejs.org/api/cli.html)
- [Node.js process API docs](https://nodejs.org/api/process.html)
