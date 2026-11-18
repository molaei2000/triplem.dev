---
title: "Why Next.js advisories jumped to 51 in 2026, and what the team is changing about it"
description: "Next.js counts 51 security advisories in 2026, up from 14. Here is the cause, the AI-driven review and audit process behind it, and the upgrade tooling in 16.4."
date: 2026-11-18
cover: /images/blog/2026-11-18-nextjs-ai-security-advisories.svg
tags: [next.js, security, ai-tools]
draft: false
---

On November 17 the Next.js team published [How we're using AI to make Next.js more secure](https://nextjs.org/blog/how-were-using-ai-to-make-nextjs-more-secure). It is the first time the team has put numbers on the trend you have probably felt in your dependency dashboard, and it explains the process changes behind it. The most useful parts for an engineer who owns a production app are the cause of the spike, the new release cadence, and the tooling that now nags you to upgrade.

## The numbers

The post lists advisories per year: 6 in 2024, 14 in 2025, and 51 so far in 2026. The team's explanation is blunt: AI made vulnerabilities cheaper to find. Every mature framework carries a backlog of edge-case bugs that were either never discovered or too impractical to exploit. When finding and exploiting them gets cheap, they stop being edge cases and become worth fixing.

The age breakdown supports that reading. Of this year's 51 vulnerabilities, 70% were in code at least a year old, and 43% were in code three years old or more. Only 30% came from code under a year old. The team says the same pattern shows up in other mature frameworks and languages.

A second factor is upstream code. Image optimization is built into Next.js, and some of the image libraries it depends on came under heavier scrutiny. Many of this year's advisories came from those libraries rather than from Next.js itself.

## What changed on the framework side

The post splits the response into clearing the old backlog and keeping new code clean.

**Old code:**

- A bug bounty program, so that reporting privately pays better than exploiting.
- An internal bot, built with Eve, that triages incoming reports, builds reproductions, checks severity and judges whether a fix is comprehensive.
- A manual audit by Trail of Bits, which found issues the other channels had missed.

**New code:**

- Vercel Agent's Security Review runs on every pull request to Next.js and tries to exploit the change using the project's own security guidelines. The team says it has already caught issues in PRs that had passed review and CI.
- Service boundaries are being formalized through [Adapters](https://nextjs.org/docs/app/getting-started/deploying#adapters). The reasoning is that disagreements between layers (proxy, CDN, runtime) are a source of bypasses, so a defined contract between Next.js and the host should remove that class of bug as adoption grows. That is a forecast, not a shipped result.
- Image optimization dependencies are being reconsidered. The team points to memory-safe codecs and an experimental repository, [next-safe-image-optimization](https://github.com/vercel-labs/next-safe-image-optimization), and says more will follow. Treat it as work in progress.

The release process changed too. Security releases now ship roughly monthly and are announced in advance, so you can plan the upgrade and hosts can deploy protections before details become public. If you saw our earlier posts on the September releases, this is the process behind that rhythm.

## What it changes in your app

Starting in Next.js 16.4, `next dev` and `next build` warn you when the installed version is affected by a known vulnerability. In development the DevTools also shows a Vulnerability Insight with a prompt you can paste into a coding agent. The dev output looks like this:

```
Installed Next.js version 16.4.0 is affected by a known
security vulnerability.

Next.js security version upgrade available: 16.4.0 -> 16.4.5
```

There is also an agent-driven upgrade path:

```bash
npx next@canary upgrade --agent
```

Per the post, the command checks your version against the advisories and selects the latest safe release. It stays within the oldest major version that has a fix, so a patch does not force a major migration. It then hands the work to your coding agent together with the matching migration guides, so the agent can apply changes and verify the app still works.

## Trade-offs and caveats

- **Advisory count is a weak risk signal.** 51 is a count of fixed bugs, and the team's own data says most were old. A rising count on a framework with a working disclosure process mostly measures discovery effort. It does not tell you how many unknown bugs remain.
- **The trend claim is a prediction.** The team writes that it expects the yearly count to turn once the backlog is burned down. That has not happened yet, so plan for monthly patching in the meantime.
- **The agent upgrade runs on `next@canary`.** Using a canary CLI to upgrade a production repo is something you should review like any other automated change. Run it on a branch, read the diff, and let CI decide. An agent that "verifies the app still works" is only as good as your test suite.
- **Warnings in `build` can become noise.** If a pinned version lags the fixed release, every build prints the warning. Decide whether to fail CI on it deliberately, instead of letting people learn to ignore it. The post does not say whether the check can fail a build, so do not assume it does.
- **Self-hosting is where the exposure lives.** The post argues Adapters will remove bypasses caused by layer disagreement. Until your host implements them, your own proxy or CDN rules remain part of your attack surface.

## A practical checklist

1. Move to a version at or above the latest fix on your major line, and read each monthly release announcement for whether your setup (image optimization, middleware or proxy, hosting layer) is affected.
2. Automate dependency updates so a monthly patch is a routine merge rather than an event.
3. Treat the dev warning as a signal to act, not a flag to dismiss with "skip until next version".
4. If you use a coding agent for upgrades, pin the scope: security patch only, no unrelated refactors, tests must pass.

The broader lesson applies beyond Next.js. If attackers get cheap automated bug finding, maintainers and application teams both need cheap automated patching. The framework team is investing on both ends, and the part you control is how fast a patch reaches production.

## Sources

- [How we're using AI to make Next.js more secure](https://nextjs.org/blog/how-were-using-ai-to-make-nextjs-more-secure)
- [The latest Next.js news](https://nextjs.org/blog)
