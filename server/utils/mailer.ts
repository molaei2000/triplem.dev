import type { ContactMessage } from "#shared/contact";
import { lookup } from "node:dns/promises";
import { createTransport } from "nodemailer";

/**
 * Nodemailer picks a random A/AAAA record for the SMTP host. On servers with no
 * IPv6 route (many VPSs, Docker's default bridge) an AAAA pick fails with
 * ENETUNREACH, so connect over IPv4 when there is one; TLS still verifies the
 * certificate against the real hostname via `servername`.
 */
async function ipv4(host: string) {
    try {
        return (await lookup(host, { family: 4 })).address;
    } catch {
        return host;
    }
}

/** SMTP transport (Gmail by default; see `.env.example`). Built per message: sends are rare. */
async function createSmtpTransport() {
    const { smtp } = useRuntimeConfig();
    const port = Number(smtp.port);
    return createTransport({
        host: await ipv4(smtp.host),
        port,
        secure: port === 465,
        tls: { servername: smtp.host },
        auth: { user: smtp.user, pass: smtp.pass },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
    });
}

const TOPIC_LABELS: Record<ContactMessage["topic"], string> = {
    project: "Project",
    role: "Role",
    collaboration: "Collaboration",
    other: "Something else",
};

function escapeHtml(s: string) {
    return s.replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
    );
}

/**
 * Sends a contact message to the site owner, with the visitor as Reply-To.
 * Nothing is ever sent to the visitor's address, so the form can't be used
 * to relay mail to third parties.
 */
export async function sendContactMail(
    msg: ContactMessage,
    meta: { ip: string; userAgent?: string },
) {
    const { smtp, contact } = useRuntimeConfig();
    const topic = TOPIC_LABELS[msg.topic];
    const subject = `[triplem.dev] ${topic} — ${msg.name}`;
    const text = [
        `${msg.message}`,
        "",
        "—",
        `From: ${msg.name} <${msg.email}>`,
        `Topic: ${topic}`,
        `Locale: ${msg.locale}`,
        `IP: ${meta.ip}`,
        `User agent: ${meta.userAgent ?? "unknown"}`,
    ].join("\n");

    if (!smtp.user || !smtp.pass) {
        if (import.meta.dev) {
            console.info(
                `[contact] SMTP is not configured; logging instead of sending.\n${subject}\n${text}`,
            );
            return;
        }
        throw createError({
            statusCode: 503,
            statusMessage: "The contact form is not configured.",
        });
    }

    const html = `<div style="font:15px/1.6 system-ui,sans-serif;color:#1b1a17">
<p style="white-space:pre-wrap;margin:0 0 24px" dir="auto">${escapeHtml(msg.message)}</p>
<hr style="border:0;border-top:1px solid #ddd">
<p style="color:#57534b;font-size:13px;margin:12px 0 0">
${escapeHtml(msg.name)} &lt;${escapeHtml(msg.email)}&gt; · ${topic} · ${msg.locale}<br>
${escapeHtml(meta.ip)} · ${escapeHtml(meta.userAgent ?? "unknown")}
</p></div>`;

    const transport = await createSmtpTransport();
    await transport.sendMail({
        from: { name: "triplem.dev", address: smtp.user },
        to: contact.to || smtp.user,
        replyTo: { name: msg.name, address: msg.email },
        subject,
        text,
        html,
    });
}
