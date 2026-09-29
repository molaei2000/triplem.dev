import type { ContactRequest } from "#shared/contact";
import { CONTACT_MIN_ELAPSED, contactSchema } from "#shared/contact";

/**
 * POST /api/contact — validates a contact message and emails it to the owner.
 *
 * Abuse controls, cheapest first: a per-IP and a global rate limit (protects
 * the Gmail quota), then a honeypot and a minimum fill time. Bots that trip
 * those get a normal `{ ok: true }` so they learn nothing.
 */
export default defineEventHandler(async (event) => {
    const ip = clientIp(event);
    enforceRateLimit(event, `contact:ip:${ip}`, 5, 15 * 60_000);
    enforceRateLimit(event, "contact:all", 60, 60 * 60_000);

    const body = (await readBody<ContactRequest | null>(event)) ?? ({} as ContactRequest);
    const tooFast = typeof body.elapsed !== "number" || body.elapsed < CONTACT_MIN_ELAPSED;
    if (body.website || tooFast) return { ok: true };

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
        throw createError({
            statusCode: 422,
            statusMessage: "Invalid contact message.",
            data: { fields: [...new Set(parsed.error.issues.map(i => String(i.path[0])))] },
        });
    }

    try {
        await sendContactMail(parsed.data, { ip, userAgent: getHeader(event, "user-agent") });
    }
    catch (error) {
        if (isError(error)) throw error;
        console.error("[contact] send failed", error);
        throw createError({ statusCode: 502, statusMessage: "The message could not be sent." });
    }

    return { ok: true };
});
