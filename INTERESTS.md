# Interests

## Audience

Senior front-end engineer. Skip beginner explanations; focus on what changed, why, and trade-offs.

## Topics (highest priority first)

- Vue / Nuxt releases, RFCs, and ecosystem tooling
- React / Next.js releases and rendering model changes (RSC, SSR, streaming)
- Web platform: new browser APIs, CSS features, Baseline status changes
- Build tooling: Vite, Rolldown, bundlers, TypeScript
- Web performance and Core Web Vitals
- AI-assisted development tooling

### Vue / Nuxt

- Vue 3 reactivity, compiler, runtime, rendering, and Composition API changes
- Vue Vapor Mode and compiler-driven performance improvements
- Vue macros, `<script setup>`, composables, provide/inject, and component architecture
- Nuxt 3/4 architecture and migration changes
- Nuxt server/client boundaries and universal code
- `useFetch`, `useAsyncData`, `useState`, payload extraction, keys, dedupe, caching, and invalidation
- SSR, SSG, hybrid rendering, ISR-like patterns, route rules, prerendering, and deployment targets
- Nitro internals, server routes, middleware, storage, caching, and adapters
- Nuxt modules, layers, runtime configuration, hooks, and module authoring
- Nuxt Content: collections, queries, indexing, markdown components, and content-driven sites
- SEO and metadata: `useSeoMeta`, `useHead`, canonical URLs, Open Graph, structured data, and sitemap/robots tooling
- Nuxt UI, Tailwind CSS, Vuetify, shadcn-vue, and component-library architecture
- Vue accessibility, forms, validation, and complex UI state
- Vue DevTools and debugging/profiling workflows
- Nuxt deployment on Node, serverless, edge, containers, and traditional hosting

### React / Next.js

- React releases, RFCs, compiler changes, and concurrent rendering
- React Server Components, Client Components, hydration, and server/client boundaries
- React Compiler and automatic memoization: what it changes and when manual optimization still matters
- Suspense, streaming SSR, selective hydration, and progressive rendering
- Next.js App Router architecture and migration patterns
- Next.js caching, revalidation, cache invalidation, and rendering behavior
- Server Actions / Server Functions and secure mutation patterns
- Route Handlers, middleware/proxy behavior, authentication boundaries, and request lifecycle
- Metadata API, dynamic metadata, structured data, and SEO
- Image/font optimization and asset delivery
- Partial prerendering and evolving rendering architectures
- TanStack Query with React and Vue, especially server-state synchronization and cache design
- State management trade-offs: Context, Zustand, Redux Toolkit, Pinia, persisted state, and server state

### Web Platform

- New browser APIs and platform capabilities
- Baseline Newly Available / Widely Available changes
- CSS platform evolution: container queries, cascade layers, nesting, subgrid, view transitions, anchor positioning, and modern responsive techniques
- CSS performance, layout/paint/compositing behavior, and rendering costs
- Web Components, Custom Elements, Shadow DOM, and interoperability with Vue/React
- JavaScript platform evolution and modern ECMAScript features
- TC39 proposals and what they mean for production applications
- Web Workers, Service Workers, WebSockets, WebTransport, BroadcastChannel, and related browser primitives
- View Transitions API and SPA/MPA navigation patterns
- Web APIs for storage, networking, permissions, media, and device capabilities
- Accessibility platform changes, semantic HTML, ARIA, and keyboard/pointer interaction
- Browser compatibility and progressive enhancement strategies

### Build Tooling / TypeScript

- Vite releases, architecture, plugin APIs, dependency optimization, and build/runtime differences
- Rolldown and the convergence of Vite's development and production toolchain
- Rollup, esbuild, SWC, Babel, and bundler architecture
- TypeScript releases, type-system improvements, compiler performance, and configuration
- TypeScript project references, module resolution, declaration generation, and monorepo workflows
- ESM/CJS interoperability and package export/import conditions
- Tree-shaking, code splitting, chunk strategy, dynamic imports, and lazy loading
- Monorepos, workspaces, pnpm, Turborepo, Nx, and package architecture
- ESLint, typescript-eslint, Prettier, oxlint, Biome, and modern lint/format tooling
- CI build performance, caching, reproducible builds, and dependency management
- Source maps, bundle analysis, profiling, and debugging production builds

### Web Performance

- Core Web Vitals: LCP, INP, CLS, and their practical causes
- TTFB, FCP, interaction latency, long tasks, and main-thread contention
- SSR/SSG/hybrid rendering performance trade-offs
- Hydration cost, JavaScript execution, and reducing client-side work
- Image optimization, responsive images, modern formats, and loading priorities
- Font loading, `font-display`, preloading, subsetting, and variable fonts
- Network performance: HTTP/2, HTTP/3, QUIC, compression, caching, and CDN behavior
- Browser caching, cache-control, stale-while-revalidate, and application-level caching
- RUM vs synthetic performance testing
- Lighthouse, Chrome DevTools Performance, WebPageTest, CrUX, and field data
- Performance budgets and regression detection in CI
- Memory usage, garbage collection, event listeners, and client-side leaks
- Virtualization/windowing for large lists and data-heavy interfaces
- Rendering performance: layout thrashing, forced reflow, paint, compositing, and animation
- Performance patterns for large enterprise applications

### Architecture / Engineering Practices

- Front-end architecture for large-scale and enterprise applications
- Component boundaries, design systems, reusable primitives, and API design
- Feature-based architecture and domain-oriented front-end organization
- State ownership: local UI state vs shared state vs server state
- Data fetching architecture and request deduplication
- Error handling, loading states, optimistic updates, and resilience
- Authentication, authorization, session handling, and secure client/server boundaries
- Front-end security: XSS, CSRF, CSP, CORS, token handling, dependency risks, and supply-chain security
- API contracts, REST, GraphQL, typed clients, and schema-driven development
- Testing strategy: unit, integration, component, E2E, visual regression, and contract testing
- Playwright, Vitest, Testing Library, and modern browser-testing workflows
- Git workflows, code review, trunk-based development, release strategies, and safe rollbacks
- Observability: Sentry, logging, tracing, frontend error monitoring, and real-user diagnostics
- Technical debt management, refactoring strategies, and migration planning
- Developer experience and reducing feedback-loop time

### AI-Assisted Development

- AI coding agents and IDE integrations
- Claude Code, Codex, GitHub Copilot, Cursor, and similar developer tools
- Agentic coding workflows and autonomous software-development loops
- Repository-aware coding agents and context engineering
- MCP and tool-connected development workflows
- AI-assisted code review, debugging, refactoring, testing, and documentation
- AI-generated tests and validation of generated code
- Prompt/context design for large codebases
- AI-assisted architecture exploration and technical research
- Measuring AI productivity rather than relying on hype
- Security and privacy implications of AI coding tools
- Local models vs hosted models for development workflows
- Using AI to understand unfamiliar repositories and legacy systems

### Full-Stack / Backend Topics Relevant to Front-End

- Node.js runtime releases, performance, and APIs
- Nitro and Node server architecture
- REST API design and typed API clients
- PostgreSQL and relational data concepts relevant to application architecture
- Redis and caching patterns
- Authentication systems, OAuth/OIDC, JWT, sessions, and WebAuthn/passkeys
- Webhooks, queues, background jobs, and event-driven architectures
- Docker, containers, and deployment workflows
- Cloud/edge/serverless trade-offs
- Observability across frontend and backend boundaries

### Developer Productivity / Ecosystem

- Modern terminal and CLI workflows
- GitHub ecosystem and developer automation
- Package manager evolution and dependency hygiene
- Documentation tooling and developer portals
- Storybook and component-driven development
- Design-to-code workflows and Figma integration
- Open-source project structure, contribution workflows, and maintainer practices
- Engineering productivity metrics and practical DX improvements

## Pro tips (used when there's no substantive news)

### Nuxt

- Data fetching: `useFetch` / `useAsyncData` keys, caching, dedupe, aborting, lazy/immediate behavior, payload reuse, and invalidation
- Rendering modes: SSR, SSG, hybrid rendering, route rules, prerendering, and runtime decisions
- Nitro server routes, middleware, storage, caching, and response headers
- Nuxt modules and layers: when to use each, how to avoid coupling, and how to design reusable modules
- Nuxt Content queries, collections, indexing, and content-driven architecture
- SEO/meta utilities and avoiding duplicate or inconsistent metadata
- Nuxt UI, Tailwind, Vuetify, and shadcn-vue composition patterns
- Performance profiling, hydration reduction, bundle analysis, and client/server boundary optimization
- Deployment and runtime configuration mistakes
- Before/after examples that demonstrate measurable DX or performance improvements

### Next.js

- App Router patterns and avoiding unnecessary Client Components
- Server Components vs Client Components boundaries
- Caching and revalidation semantics
- Server Actions / Server Functions and mutation design
- Route Handlers, middleware/proxy, and authentication boundaries
- Metadata API and SEO
- Image/font optimization
- Streaming and Suspense boundaries
- Avoiding accidental dynamic rendering
- Request waterfalls and parallel data fetching
- Bundle-size reduction and client JavaScript minimization
- Before/after examples that fix a real performance or DX issue

### Vue / React

- Reactivity and rendering-cost mistakes
- Unnecessary watchers/effects
- Derived state vs duplicated state
- Stable component boundaries
- Memoization only where it solves a measured problem
- Server state vs client state
- Form architecture and validation
- Accessibility mistakes in reusable components
- Type-safe component APIs
- Composition patterns that reduce coupling

### Web Platform / Performance

- New browser APIs that can replace JavaScript-heavy implementations
- CSS features that simplify component logic
- Baseline changes that make previously risky APIs production-ready
- Core Web Vitals regressions caused by common framework patterns
- Performance fixes backed by DevTools, Lighthouse, CrUX, or RUM evidence
- Prefer practical before/after code and explain the underlying browser behavior

### TypeScript / Tooling

- Type-system improvements that simplify real application code
- Compiler and build-performance improvements
- Vite/Rolldown configuration mistakes
- ESM/CJS compatibility issues
- Bundle-size and dependency-graph problems
- Monorepo and package-boundary improvements

### AI Development

- Practical agent workflows for real repositories
- Context engineering rather than generic prompt tricks
- Safe use of agents for refactoring and migrations
- Reviewing AI-generated code for correctness, security, and maintainability
- Comparing tools based on workflow and technical capability, not hype

## Preferred sources

- Official blogs and changelogs:
    - vuejs.org
    - nuxt.com
    - react.dev
    - nextjs.org
    - vite.dev
    - typescriptlang.org
    - web.dev
    - developer.chrome.com
    - nodejs.org
- Official documentation:
    - nuxt.com/docs
    - nextjs.org/docs
    - vuejs.org/guide
    - react.dev
    - vite.dev/guide
    - typescriptlang.org/docs
    - developer.mozilla.org
- GitHub releases, RFCs, proposals, and issue discussions from the relevant projects
- MDN, TC39, W3C, WHATWG
- Chrome Platform Status and Baseline
- Web.dev / Chrome Developers for performance and browser-platform guidance

## Source evaluation

- Prefer primary sources over commentary.
- Verify framework behavior against current official documentation before presenting a pro tip.
- For releases, prioritize changelogs/release notes over third-party summaries.
- For browser features, check Baseline and actual browser support.
- For proposals, clearly distinguish proposal-stage behavior from shipped behavior.
- When sources disagree, explain the discrepancy rather than silently choosing one.
- Avoid presenting benchmarks without methodology, workload, environment, and version information.

## Avoid

- Beginner tutorials when an advanced explanation is possible
- Listicles, SEO content farms, "top 10" posts
- Generic productivity advice
- Framework hype without technical substance
- Pure funding, acquisition, or company news without engineering relevance
- AI hype without concrete workflow or technical evidence
- Benchmarks without methodology
- Old framework advice presented as current
- Cargo-cult performance optimizations
- Recommendations that ignore trade-offs or operational complexity

## What makes a useful update

For release/news updates:

1. What changed?
2. Why does it matter?
3. What does it change for production applications?
4. Migration or compatibility concerns
5. Performance/DX implications
6. A small code example when useful
7. Links to the primary source

For pro tips:

1. Identify the common mistake
2. Show the problematic pattern
3. Explain why it is problematic
4. Show the improved pattern
5. Explain the trade-off
6. Mention when the original pattern is still appropriate

## Tone

Direct, technical, no filler.

- Assume strong JavaScript/TypeScript knowledge.
- Do not explain basic concepts unless they are necessary for a subtle point.
- Prefer code examples over long prose.
- Explain trade-offs explicitly.
- Separate stable knowledge from experimental/proposal-stage features.
- Call out version-specific behavior.
- Prefer practical, production-oriented examples.
- Focus on actionable engineering insight rather than news volume.
