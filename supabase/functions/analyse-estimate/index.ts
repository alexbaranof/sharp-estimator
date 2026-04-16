import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Anthropic from "npm:@anthropic-ai/sdk"

const client = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
})

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
      }
    })
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const { description, photoUrls, projectContext } = await req.json()

    // Build message content — images first, text prompt last
    const content: Anthropic.MessageParam["content"] = []

    // Add up to 3 photos as base64
    for (const url of (photoUrls ?? []).slice(0, 3)) {
      const imgResponse = await fetch(url)
      const buffer = await imgResponse.arrayBuffer()
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
      content.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: b64 }
      })
    }

    // Add the text prompt
    content.push({
      type: "text",
      text: `
You are an expert UK construction estimator helping a contractor produce a professional cost estimate for works.

Project: ${projectContext?.name ?? "Unknown"} at ${projectContext?.address ?? "Unknown"}
Contractor description of the work: ${description}

Based on the photos (if provided) and the description, generate a detailed cost estimate.

Return ONLY a JSON object — no markdown, no explanation, no preamble. Use this exact structure:
{
  "title": "Short descriptive title for the estimate (max 10 words)",
  "scope": "Formal scope of works description (2-3 sentences, professional tone)",
  "line_items": [
    { "description": "Item description", "qty": 1, "unit": "nr", "rate": 0.00, "total": 0.00 }
  ],
  "time_estimate": 0,
  "notes": "Any assumptions, exclusions, or caveats"
}

Units must be one of: nr | m2 | m | hrs | sum
Base rates on current London market rates for skilled trades and materials.
Be thorough — include labour, materials, plant hire, and any ancillary costs.
Be conservative — the contractor can adjust figures before sending.
IMPORTANT: Always use POSITIVE values for qty, rate, and total. Never use negative numbers.
      `
    })

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content }]
    })

    const responseText = (message.content[0] as Anthropic.TextBlock).text
    const draft = JSON.parse(responseText)

    return new Response(
      JSON.stringify({ success: true, draft }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    )
  }
})
