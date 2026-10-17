import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/database.types";

const notificationSchema = z.object({
  ideaId: z.uuid(),
  sourceId: z.uuid(),
  eventType: z.enum(["new_idea", "new_comment", "status_change"]),
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function emailCopy(eventType: z.infer<typeof notificationSchema>["eventType"], actor: string, recipient: string) {
  if (eventType === "new_idea") {
    return { subject: "A new idea is ready for review", headline: "A new idea was shared", detail: `${actor} submitted an idea for your review.` };
  }
  if (eventType === "status_change") {
    return { subject: "There is an update on your idea", headline: "Your idea has an update", detail: `${actor} updated the status of your idea.` };
  }
  return {
    subject: "There is a new reply on an idea",
    headline: "A new reply was added",
    detail: `${actor} added a reply${recipient ? ` for ${recipient}` : ""}.`,
  };
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Sign in to request notifications." }, { status: 401 });
  }

  const parsed = notificationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "The notification request is invalid." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "The data service is not configured." }, { status: 503 });
  }
  if (!resendApiKey || !fromAddress) {
    return NextResponse.json({ sent: 0, disabled: true });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: deliveries, error: recipientError } = await supabase.rpc("get_idea_notification_recipients", {
    p_idea_id: parsed.data.ideaId,
    p_event_type: parsed.data.eventType,
    p_source_id: parsed.data.sourceId,
  });
  if (recipientError) {
    return NextResponse.json({ error: "The notification request could not be authorized." }, { status: 403 });
  }

  let siteUrl = request.url;
  try {
    siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin;
  } catch {
    siteUrl = new URL(request.url).origin;
  }
  const ideaUrl = `${siteUrl}/ideas/${parsed.data.ideaId}`;

  const results = await Promise.all(deliveries.map(async (delivery) => {
    const copy = emailCopy(parsed.data.eventType, delivery.actor_name, delivery.display_name);
    const safeTitle = escapeHtml(delivery.idea_title);
    const safeHeadline = escapeHtml(copy.headline);
    const safeDetail = escapeHtml(copy.detail);
    let sent = false;
    let lastError: string | null = null;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `talk-to-us/${delivery.delivery_id}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [delivery.email],
          subject: copy.subject,
          html: `<div style="margin:0;background:#f6f7ef;padding:36px 16px;font-family:Arial,sans-serif;color:#33443a"><div style="max-width:560px;margin:0 auto;background:#fffefa;border:1px solid #e7eadf;border-radius:18px;padding:32px"><p style="margin:0 0 20px;color:#809169;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Talk To Us</p><h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:28px;font-weight:500">${safeHeadline}</h1><p style="margin:0;color:#69786d;line-height:1.65">${safeDetail}</p><div style="margin:24px 0;padding:16px;border-radius:12px;background:#f6f7ef"><strong style="display:block;margin-bottom:6px;color:#44564a">${safeTitle}</strong><span style="color:#859087;font-size:13px">Shared idea</span></div><a href="${escapeHtml(ideaUrl)}" style="display:inline-block;border-radius:10px;background:#315b44;padding:12px 17px;color:#fff;text-decoration:none;font-weight:700;font-size:13px">View idea</a></div></div>`,
          text: `${copy.headline}\n\n${copy.detail}\n\n${delivery.idea_title}\n${ideaUrl}`,
        }),
        cache: "no-store",
      });
      sent = response.ok;
      if (!sent) lastError = `Email provider returned status ${response.status}.`;
    } catch {
      lastError = "Email provider could not be reached.";
    }

    const { error: completionError } = await supabase.rpc("complete_email_notification", {
      p_delivery_id: delivery.delivery_id,
      p_sent: sent,
      p_error: lastError,
    });
    if (completionError) return { sent: false };
    return { sent };
  }));

  return NextResponse.json({ sent: results.filter((result) => result.sent).length, failed: results.filter((result) => !result.sent).length });
}
