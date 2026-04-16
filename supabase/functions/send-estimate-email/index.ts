import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
      }
    })
  }

  const { estimateId } = await req.json()
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  // Generate review token and save
  const token = crypto.randomUUID()
  await supabase.from("estimates").update({
    review_token: token,
    status: "sent"
  }).eq("id", estimateId)

  // Fetch estimate details for email
  const { data: estimate } = await supabase
    .from("estimates")
    .select("*, projects(*)")
    .eq("id", estimateId)
    .single()

  const reviewUrl = `${Deno.env.get("APP_URL")}/review/${token}`

  // Send email via Resend
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: Deno.env.get("FROM_EMAIL"),
      to: estimate.projects.client_email,
      subject: `Estimate ${estimate.estimate_number} — ${estimate.projects.name}`,
      html: `
        <h2>Estimate: ${estimate.estimate_number}</h2>
        <p><strong>${estimate.title}</strong></p>
        <p>Project: ${estimate.projects.name}</p>
        <p>Total inc VAT: £${estimate.total_inc_vat?.toFixed(2)}</p>
        <br>
        <a href="${reviewUrl}" style="background:#185FA5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">
          Review Estimate
        </a>
        <br><br>
        <p style="font-size:12px;color:#888;">This estimate is valid for ${estimate.validity_days || 30} days.</p>
      `
    })
  })

  return new Response(JSON.stringify({ success: true, token }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  })
})
