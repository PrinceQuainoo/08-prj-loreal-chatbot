/**
 * Cloudflare Worker – L’Oréal Routine Builder
 * - Hides API key (never expose in the browser)
 * - Handles both routine generation and follow-up chat
 * - You can add web search here later if you do the LevelUp
 */
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), {
        status: 405, headers: { "content-type": "application/json" }
      });
    }

    try {
      const { model = "gpt-4o-mini", intent, products = [], history = [] } = await request.json();

      const systemPrompt = `
You are a helpful, brand-safe L’Oréal beauty advisor.
- Use only the provided product data to build routines.
- Reference product names and categories clearly.
- Structure routines into steps (AM/PM) with short bullet guidance.
- Be concise, friendly, and avoid medical claims.
- If user asks about unrelated topics, steer back to skincare/haircare/makeup/fragrance/body.
`;

      const userMsg =
        intent === "generate_routine"
          ? `Create a tailored routine from these selected products:\n${JSON.stringify(products)}`
          : `Answer user follow-up about the generated routine.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userMsg }
      ];

      // OpenAI Chat Completions
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7
        })
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        return new Response(JSON.stringify({ error: "OpenAI error", detail: errText }), {
          status: 500, headers: { "content-type": "application/json" }
        });
      }

      const json = await openaiRes.json();
      const reply = json.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

      return new Response(JSON.stringify({ reply }), {
        headers: { "content-type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: "Worker failure", detail: String(err) }), {
        status: 500, headers: { "content-type": "application/json" }
      });
    }
  }
};

/**
 * Wrangler TOML (example):
 * ---
 * name = "loreal-routine-worker"
 * main = "src/index.js"
 * compatibility_date = "2024-08-01"
 *
 * [vars]
 * # none
 *
 * [env.production]
 * # none
 *
 * [vars]
 * # set in dashboard: OPENAI_API_KEY
 */
