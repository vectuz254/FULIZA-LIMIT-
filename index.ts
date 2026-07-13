// supabase/functions/chat-assistant/index.ts
// Deploy: supabase functions deploy chat-assistant --no-verify-jwt
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//          (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-available in Edge Functions)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the support assistant for TOPJOBSEEKERS, a Kenyan recruitment
agency placing candidates in jobs abroad (UAE, Qatar, Saudi Arabia, UK, Germany, and more)
and locally in Kenya.

Rules:
- Only state facts you got from a tool call, or general/well-known info about the recruitment
  process. Never invent job openings, fees, visa timelines, or application statuses.
- If asked about a specific application's status, use check_application_status — you need
  BOTH the email and phone number the person used when submitting to look it up. Never guess.
- Keep answers short and conversational (2-4 sentences), like a helpful staff member texting back.
- If you don't have an answer, say so honestly and suggest they WhatsApp +254 748801685 or
  email topjobsseekers@gmail.com for anything you can't resolve.
- Never provide legal, medical, or immigration guarantees. Point to official next steps instead.`;

const TOOLS = [
  {
    name: "search_jobs",
    description: "Search currently open job listings by category and/or destination country.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", description: "e.g. Healthcare, IT, Construction, Hospitality" },
        country: { type: "string", description: "e.g. UAE, Qatar, Germany" },
      },
    },
  },
  {
    name: "check_application_status",
    description: "Look up a candidate's CV submission status. Requires both email and phone to match for privacy.",
    input_schema: {
      type: "object",
      properties: {
        email: { type: "string" },
        phone: { type: "string" },
      },
      required: ["email", "phone"],
    },
  },
  {
    name: "get_faq_answer",
    description: "Look up an answer to a general question about fees, process, timelines, documents, or visas.",
    input_schema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "one of: visa_process, fees, cv_review, timeline, documents, or 'general'" },
      },
      required: ["topic"],
    },
  },
];

async function runTool(name: string, input: any) {
  if (name === "search_jobs") {
    let query = supabaseAdmin.from("jobs").select("*").eq("active", true).limit(5);
    if (input.category) query = query.ilike("category", `%${input.category}%`);
    if (input.country) query = query.ilike("country", `%${input.country}%`);
    const { data } = await query;
    return data && data.length
      ? data.map((j: any) => `${j.title} at ${j.company} (${j.location}) — ${j.salary}`).join("\n")
      : "No matching open roles right now.";
  }

  if (name === "check_application_status") {
    const { data } = await supabaseAdmin
      .from("cv_submissions")
      .select("status, job_category, destination, created_at")
      .eq("email", input.email)
      .eq("phone", input.phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data
      ? `Found: submitted ${new Date(data.created_at).toLocaleDateString()}, category ${data.job_category || "N/A"}, destination ${data.destination || "N/A"}, current status: ${data.status}.`
      : "No submission found matching that email and phone number combination.";
  }

  if (name === "get_faq_answer") {
    const { data } = await supabaseAdmin
      .from("site_faq")
      .select("answer")
      .eq("active", true)
      .ilike("topic", `%${input.topic}%`)
      .limit(1)
      .maybeSingle();
    return data ? data.answer : "No specific FAQ entry found for that topic.";
  }

  return "Unknown tool.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const { message, history = [], session_id } = await req.json();

    await supabaseAdmin.from("chat_logs").insert({ session_id, role: "user", message });

    let messages = [...history, { role: "user", content: message }];

    // Agentic loop: let Claude call tools until it produces a final text answer
    let finalText = "";
    for (let i = 0; i < 4; i++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages,
        }),
      });
      const data = await res.json();

      const toolUses = (data.content || []).filter((c: any) => c.type === "tool_use");
      const textBlocks = (data.content || []).filter((c: any) => c.type === "text");

      if (toolUses.length === 0) {
        finalText = textBlocks.map((t: any) => t.text).join("\n");
        break;
      }

      messages.push({ role: "assistant", content: data.content });
      const toolResults = [];
      for (const use of toolUses) {
        const result = await runTool(use.name, use.input);
        toolResults.push({ type: "tool_result", tool_use_id: use.id, content: result });
      }
      messages.push({ role: "user", content: toolResults });
    }

    await supabaseAdmin.from("chat_logs").insert({ session_id, role: "assistant", message: finalText });

    return new Response(JSON.stringify({ reply: finalText }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ reply: "Sorry, something went wrong. Please try again or WhatsApp us at +254 748801685." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
