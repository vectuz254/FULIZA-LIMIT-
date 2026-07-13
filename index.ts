// Supabase Edge Function: notify-cv
// Triggered by a Database Webhook on INSERT into public.cv_submissions.
// Sends you an email via Resend (resend.com — free tier is enough for this).
//
// DEPLOY:
//   supabase functions deploy notify-cv
//   supabase secrets set RESEND_API_KEY=your_resend_api_key
//   supabase secrets set NOTIFY_EMAIL=vectuz9@gmail.com
//
// THEN in Supabase Dashboard → Database → Webhooks → Create a new webhook:
//   Table: cv_submissions   Event: INSERT
//   Type: Supabase Edge Function   Function: notify-cv

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const NOTIFY_EMAIL = Deno.env.get("NOTIFY_EMAIL") ?? "vectuz9@gmail.com";

    const html = `
      <h2>New CV Submission — TOPJOBSEEKERS</h2>
      <p><strong>Name:</strong> ${record.full_name}</p>
      <p><strong>Phone:</strong> ${record.phone}</p>
      <p><strong>Email:</strong> ${record.email}</p>
      <p><strong>Destination:</strong> ${record.destination ?? "Not specified"}</p>
      <p><strong>Category:</strong> ${record.job_category ?? "Not specified"}</p>
      <p><strong>Intro:</strong> ${record.intro ?? "-"}</p>
      <p><strong>CV file path:</strong> ${record.cv_file_path}</p>
      <p>Log in to the admin dashboard to review and download the CV.</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TOPJOBSEEKERS Alerts <alerts@yourdomain.com>", // must be a domain verified in Resend
        to: [NOTIFY_EMAIL],
        subject: `New CV Submission: ${record.full_name}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ ok: false, error: errText }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});
