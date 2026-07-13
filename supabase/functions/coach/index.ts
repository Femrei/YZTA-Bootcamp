import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Insight {
  summary: string;
  week_total_kg: number;
  daily_avg_kg: number;
  by_category: Record<string, number>;
  by_subtype: Record<string, number>;
  week_change_pct: number | null;
}

function userPrompt(insight: Insight): string {
  return (
    "Kullanıcının haftalık özeti:\n" +
    `- Toplam: ${insight.week_total_kg} kg CO₂e (günlük ort. ${insight.daily_avg_kg} kg)\n` +
    `- Kategori kırılımı: ${JSON.stringify(insight.by_category)}\n` +
    `- Alt kırılım: ${JSON.stringify(insight.by_subtype)}\n` +
    `- Haftalık değişim: ${insight.week_change_pct}%\n` +
    `- İçgörü özeti: ${insight.summary}\n` +
    "3 kişisel öneri üret."
  );
}

function extractTips(text: string): string[] | null {
  text = text.replace(/```(?:json)?|```/g, "").trim();
  try {
    const data = JSON.parse(text);
    const tips = data.tips;
    if (Array.isArray(tips) && tips.length >= 3) {
      return tips.slice(0, 3).map((t: unknown) => String(t).trim());
    }
  } catch {
    // fall through
  }
  return null;
}

async function callGemini(insight: Insight, systemPrompt: string): Promise<string[] | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return null;
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt(insight) }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) return null;
  const json = await resp.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  return extractTips(text);
}

async function callOpenAI(insight: Insight, systemPrompt: string): Promise<string[] | null> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return null;
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt(insight) },
      ],
      temperature: 0.7,
      max_tokens: 400,
    }),
  });
  if (!resp.ok) return null;
  const json = await resp.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) return null;
  return extractTips(text);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { insight, systemPrompt } = await req.json() as {
      insight: Insight;
      systemPrompt: string;
    };

    let tips: string[] | null = null;
    let provider = "rule_based";

    tips = await callGemini(insight, systemPrompt);
    if (tips) provider = "gemini";

    if (!tips) {
      tips = await callOpenAI(insight, systemPrompt);
      if (tips) provider = "openai";
    }

    if (!tips) {
      return new Response(
        JSON.stringify({ tips: null, provider: "rule_based" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ tips, provider }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, tips: null, provider: "rule_based" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
