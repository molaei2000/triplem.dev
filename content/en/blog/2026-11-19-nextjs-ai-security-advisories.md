---
title: "Why Next.js advisories jumped to 51 in 2026, and the upgrade tooling that came with it"
description: "Next.js explains the rise in advisories: AI finds old bugs cheaply. What the team changed, how version warnings and next upgrade --agent work, and what to plan for."
date: 2026-11-19
cover: /images/blog/2026-11-19-nextjs-ai-security-advisories.svg
tags: [next.js, security, ai-tooling]
draft: false
---

On November 17 the Next.js team published [How we're using AI to make Next.js more secure](https://nextjs.org/blog/how-were-using-ai-to-make-nextjs-more-secure). It is partly an explanation of a trend you have probably felt in your upgrade queue, and partly an announcement of tooling that changes how you are supposed to take patches. Both parts affect how you should run a Next.js production app.

## The numbers, and the team's explanation

The post lists advisories per year: 6 in 2024, 14 in 2025, and 51 so far in 2026. The team's reading is that AI made vulnerabilities cheaper to find and exploit, so bugs that used to be impractical edge cases are now worth fixing. Their supporting data: of this year's 51, 70% were in code at least a year old, and 43% in code three years or older. Only 30% came from code under a year old.

That is the team's own analysis, and it is a claim about their codebase rather than an independent audit. It is still a useful frame: the rise does not mean the framework got worse in 2026, it means a backlog is being drained. The post also notes that many of the more serious issues came from upstream dependencies, particularly the image libraries behind image optimization, not from Next.js code itself.

## What the team changed on their side

Three efforts address the backlog of old bugs:

- A bug bounty program, intended to make private reporting more profitable than exploitation.
- An internal bot, built with Eve, that helps triage reports, build reproductions, confirm severity and check whether a fix is complete.
- A manual audit by Trail of Bits, which found issues the other sources had missed.

Two address new code:

- An adversarial review agent (Vercel Agent's Security Review) now runs on every pull request and tries to exploit the change using custom guidelines. The post says it has caught issues in PRs that already had a green CI and a passing review.
- Hardening service boundaries. Disagreements between layers (proxy, CDN, runtime) can be a source of bypasses, so the team is formalizing those seams with Adapters, a contract describing how hosts should serve a Next.js app.

On dependencies, the team says it is moving image optimization toward memory-safe codecs and using AI to prototype the integrations and sandboxing quickly. They promise more detail later, so treat this as direction, not shipped behavior.

## The cadence you now plan around

Security releases now come roughly monthly and are announced in advance, so hosting providers can add protections before details go public. The [Next.js blog index](https://nextjs.org/blog) shows the rhythm: an "Upcoming" announcement about a week before each release (for example October 27 for the November 3 release), with out-of-band updates in between when an upstream issue is critical (September 22 and October 14).

For a team, this turns patching into a standing process instead of an incident response. If your pipeline treats a Next.js bump as a quarterly chore, the arithmetic no longer works.

## Version warnings in `next dev` and `next build`

Starting in Next.js 16.4, `next dev` and `next build` tell you when the installed version is affected by a known vulnerability. In development, DevTools shows a Vulnerability Insight with a prompt you can paste into a coding agent. The interactive reminder offers three choices: upgrade now, skip, or skip until the next version.

The [agent upgrade guide](https://nextjs.org/docs/app/guides/upgrading/agent-upgrade) documents the configuration. Reminders are on by default with the `security` policy, and you choose another policy or disable them in `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        agentUpgrade: "latest", // or "security", "experimental-future", or false
    },
};

export default nextConfig;
```

Two details matter in practice. The reminder never upgrades anything by itself. And in an interactive terminal, `next dev` or `next build` keeps running while the prompt is open and replays its buffered output if you skip.

## `next upgrade --agent`

The post and the guide describe a command that hands the upgrade to a coding agent:

```bash
npx next@canary upgrade --agent
```

Per the guide, it first checks the installed version, release metadata and the security data the policy needs, and stops with an explanation if no upgrade is needed or no target can be established. Otherwise it copies the relevant migration guides and Skills into a temporary directory and builds a task for the agent. That task asks the agent to avoid duplicate work, use a separate Git worktree when one is available, run the relevant checks and verify the result.

The policies are:

| Policy                | Behavior                                                                    |
| --------------------- | --------------------------------------------------------------------------- |
| `security`            | For an affected stable version, the latest safe release in the earliest eligible major |
| `latest`              | Moves apps to npm's `latest` stable (or a canary app to `canary`)           |
| `experimental-future` | `latest`, plus adoption of planned defaults such as Cache Components        |

The `security` policy is the interesting one: the blog post says it stays within the oldest major version that has a fix, so a patch does not force a major migration. `--agent` cannot be combined with `--revision`, it works for App Router and Pages Router projects, and run from inside an agent it prints the task for that agent to follow. In an interactive terminal it can start an installed Codex or Claude Code session.

## Caveats

- The agent upgrade guide is marked **Experimental** and says it is not recommended for production. Using it to prepare a patch PR in a worktree is a different risk than running it against a production branch unattended.
- `npx next@canary` is what the guide uses so you get the latest upgrade tooling even on an older Next.js. That is a deliberate reach for canary tooling, so pin your own app's version via the lockfile and review the diff as you would any dependency change.
- An agent applying a security patch still needs verification. The task asks the agent to run checks, but your own tests and a human review of the diff are the real gate.
- The advisory counts and code-age percentages come from the Next.js team about their own project. The post does not describe the methodology, so use them for direction, not as benchmarks.

## What to do with this

1. Decide who owns monthly Next.js patching, and subscribe to the "Upcoming security release" announcements.
2. Check that `next build` output in CI is read by someone. The new warning only helps if it is seen.
3. Keep tests that can validate a patch quickly, since a faster upgrade path only pays off if verification is fast.
4. Try `next upgrade --agent` on a branch before you need it, so the first time is not during an incident.
5. Audit your own image-handling paths. If the upstream libraries are where serious bugs landed, keep an eye on the codec changes the team says are coming.

## Sources

- [How we're using AI to make Next.js more secure](https://nextjs.org/blog/how-were-using-ai-to-make-nextjs-more-secure)
- [Upgrade with a coding agent (Next.js docs)](https://nextjs.org/docs/app/guides/upgrading/agent-upgrade)
- [The latest Next.js news](https://nextjs.org/blog)
