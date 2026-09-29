import { z } from "zod";

/**
 * Contact form contract, shared by the form (client-side checks, input limits)
 * and `server/api/contact.post.ts` (the authority).
 */

/** Topic ids; labels live in i18n under `contactPage.topics.<id>`. */
export const CONTACT_TOPICS = ["project", "role", "collaboration", "other"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const CONTACT_LIMITS = {
    name: 80,
    email: 254,
    message: { min: 20, max: 4000 },
} as const;

/** Anything faster than this (ms from render to submit) is treated as a bot. */
export const CONTACT_MIN_ELAPSED = 2000;

export const contactSchema = z.object({
    // Single line: the name ends up in the email's Reply-To and Subject.
    name: z.string().trim().min(1).max(CONTACT_LIMITS.name).regex(/^[^\r\n]*$/),
    email: z.string().trim().max(CONTACT_LIMITS.email).pipe(z.email()),
    topic: z.enum(CONTACT_TOPICS),
    message: z.string().trim().min(CONTACT_LIMITS.message.min).max(CONTACT_LIMITS.message.max),
    locale: z.enum(["en", "fa"]).default("en"),
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactMessage = z.output<typeof contactSchema>;
export type ContactField = keyof ContactInput;

/** What the form posts: the message plus the two anti-spam signals. */
export interface ContactRequest extends ContactInput {
    /** Honeypot. Hidden from people, so it must stay empty. */
    website?: string;
    /** Milliseconds between the form rendering and the submit. */
    elapsed?: number;
}
