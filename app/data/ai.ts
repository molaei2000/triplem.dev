/**
 * The AI section: the tools I work with and the spec-driven loop.
 * Prose lives in i18n under `ai.*` (`ai.tools.<id>`, `ai.stages.<id>`); this
 * file holds the untranslatable structure. The loop's artifacts are the files
 * behind this site's contact form, so they stay as code in both locales.
 */
export type AiToolId = "chatgpt" | "claude" | "claudeCode" | "copilot" | "opencode";
export type AiStageId = "specify" | "plan" | "tasks" | "build" | "verify";

export interface AiTool {
    id: AiToolId;
    label: string;
    /** File in app/assets/icons, used as `tm:<icon>`. */
    icon: string;
}

export interface AiStage {
    id: AiStageId;
    /** The file open in the editor window at this stage. */
    file: string;
    tools: AiToolId[];
    lines: string[];
}

export const AI_TOOLS: AiTool[] = [
    { id: "chatgpt", label: "ChatGPT", icon: "chatgpt" },
    { id: "claude", label: "Claude", icon: "claude" },
    { id: "claudeCode", label: "Claude Code", icon: "claude-code" },
    { id: "copilot", label: "GitHub Copilot", icon: "copilot" },
    { id: "opencode", label: "OpenCode", icon: "open-code" },
];

export const AI_TOOL_BY_ID = Object.fromEntries(AI_TOOLS.map((tool) => [tool.id, tool])) as Record<
    AiToolId,
    AiTool
>;

const CRITERIA = [
    "Name, email, topic and message are required",
    "At most 5 messages per IP every 15 minutes",
    "Bots get a quiet success, never an error",
    "Mail reaches me only; the visitor is Reply-To",
];

export const AI_STAGES: AiStage[] = [
    {
        id: "specify",
        file: "spec.md",
        tools: ["chatgpt", "claude"],
        lines: [
            "# Contact form",
            "",
            "## Why",
            "Visitors need a direct way to reach me,",
            "without the site becoming a spam relay.",
            "",
            "## Acceptance criteria",
            ...CRITERIA.map((c) => `- [ ] ${c}`),
        ],
    },
    {
        id: "plan",
        file: "plan.md",
        tools: ["claude", "claudeCode"],
        lines: [
            "# Plan",
            "",
            "## Shape",
            "shared/contact.ts   one zod schema, form + server",
            "contact.post.ts     rate limit → honeypot → schema",
            "mailer.ts           Gmail SMTP, IPv4 first",
            "",
            "## Decisions",
            "No auto-reply: it would make the form a relay.",
            "No SMTP credentials: log in dev, 503 in prod.",
        ],
    },
    {
        id: "tasks",
        file: "tasks.md",
        tools: ["claudeCode", "opencode"],
        lines: [
            "# Tasks",
            "",
            "- [ ] T1 Shared schema, topics and limits",
            "- [ ] T2 Rate limit: per IP and global",
            "- [ ] T3 Honeypot and minimum fill time",
            "- [ ] T4 Mailer: owner only, visitor as Reply-To",
            "- [ ] T5 Form with field-level errors",
            "- [ ] T6 Copy in en.json and fa.json",
        ],
    },
    {
        id: "build",
        file: "contact.ts",
        tools: ["claudeCode", "copilot", "opencode"],
        lines: [
            "// T1: one contract for the form and the server",
            "+ export const CONTACT_MIN_ELAPSED = 2000;",
            "+",
            "+ export const contactSchema = z.object({",
            "+     name: z.string().trim().min(1).max(80),",
            "+     email: z.string().trim().pipe(z.email()),",
            "+     topic: z.enum(CONTACT_TOPICS),",
            "+     message: z.string().trim().min(20).max(4000),",
            "+ });",
        ],
    },
    {
        // The loop closes where it started: the spec is the review checklist.
        id: "verify",
        file: "spec.md",
        tools: ["claudeCode", "copilot"],
        lines: [
            "# Contact form",
            "",
            "## Acceptance criteria",
            ...CRITERIA.map((c) => `- [x] ${c}`),
            "",
            "## Checks",
            "✓ pnpm check: lint, format, types, covers",
        ],
    },
];

/** Stages each tool takes part in, in loop order. */
export function aiToolStages(id: AiToolId) {
    return AI_STAGES.filter((s) => s.tools.includes(id)).map((s) => s.id);
}

export type AiLineKind = "heading" | "done" | "todo" | "add" | "ok" | "comment" | "text";

/** Splits an artifact line into its syntax mark (`## `, `- [x] `, `+ `, …) and the rest. */
const LINE_PATTERNS: [AiLineKind, RegExp][] = [
    ["heading", /^(#+ )(.*)$/],
    ["done", /^(- \[x\] )(.*)$/],
    ["todo", /^(- \[ \] )(.*)$/],
    ["add", /^(\+ ?)(.*)$/],
    ["ok", /^(✓ )(.*)$/],
    ["comment", /^()(\/\/.*)$/],
];

export function parseAiLine(text: string) {
    for (const [kind, re] of LINE_PATTERNS) {
        const m = re.exec(text);
        if (m) return { kind, mark: m[1]!, body: m[2]! };
    }
    return { kind: "text" as AiLineKind, mark: "", body: text };
}
