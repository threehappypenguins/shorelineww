/**
 * @module app/api/contact/route
 * @description Contact form API: verifies Cloudflare Turnstile and sends email via Mailgun.
 */

import { NextRequest, NextResponse } from "next/server";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type ContactBody = {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  "cf-turnstile-response"?: string;
};

function missing(...keys: string[]): string | null {
  for (const key of keys) {
    if (!process.env[key]) return key;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const missingKey = missing("TURNSTILE_SECRET_KEY", "MAILGUN_API_KEY", "MAILGUN_DOMAIN", "MAILGUN_FROM", "MAILGUN_TO");
    if (missingKey) {
      console.error("[contact] Missing env var:", missingKey);
      return NextResponse.json(
        { success: false, message: "Contact form is not configured." },
        { status: 500 }
      );
    }

    let body: ContactBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 }
      );
    }

  const token = body["cf-turnstile-response"];
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Verification is required." },
      { status: 400 }
    );
  }
  if (!name || !email || !subject || !message) {
    return NextResponse.json(
      { success: false, message: "Name, email, subject, and message are required." },
      { status: 400 }
    );
  }
  if (!email.includes("@")) {
    return NextResponse.json(
      { success: false, message: "Please provide a valid email address." },
      { status: 400 }
    );
  }

  const verifyRes = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY!,
      response: token,
    }),
  });

  const verifyData = (await verifyRes.json()) as { success?: boolean; "error-codes"?: string[] };
  if (!verifyData.success) {
    return NextResponse.json(
      { success: false, message: "Verification failed. Please try again." },
      { status: 400 }
    );
  }

  const mailgunHost = process.env.MAILGUN_HOST ?? "https://api.mailgun.net";
  const domain = process.env.MAILGUN_DOMAIN!;
  const apiKey = process.env.MAILGUN_API_KEY!;
  const from = process.env.MAILGUN_FROM!;
  const to = process.env.MAILGUN_TO!;

  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    `Subject: ${subject}`,
    "",
    message,
  ]
    .filter(Boolean)
    .join("\n");

  const form = new FormData();
  form.append("from", from);
  form.append("to", to);
  form.append("subject", subject);
  form.append("text", text);
  form.append("h:Reply-To", email);

  const mailgunUrl = `${mailgunHost.replace(/\/$/, "")}/v3/${domain}/messages`;
  const auth = Buffer.from(`api:${apiKey}`).toString("base64");

  const mailRes = await fetch(mailgunUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
    },
    body: form,
  });

  if (!mailRes.ok) {
    const errText = await mailRes.text();
    console.error("[contact] Mailgun error:", mailRes.status, errText);
    return NextResponse.json(
      { success: false, message: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: "Message sent." });
  } catch (err) {
    console.error("[contact] Unhandled error:", err);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
