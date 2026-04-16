import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Fast Estimator',
          short_name: 'Estimator',
          theme_color: '#0D2137',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
          ]
        }
      }),
      {
        name: 'api-middleware',
        configureServer(server) {
          server.middlewares.use('/api/analyse-estimate', async (req, res) => {
            if (req.method === 'OPTIONS') {
              res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'content-type' })
              res.end()
              return
            }
            if (req.method !== 'POST') {
              res.writeHead(405)
              res.end('Method not allowed')
              return
            }

            let body = ''
            for await (const chunk of req) body += chunk
            const { description, photoUrls, projectContext } = JSON.parse(body)

            try {
              const Anthropic = (await import('@anthropic-ai/sdk')).default
              const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

              const content = []

              // Add photos as base64
              for (const url of (photoUrls ?? []).slice(0, 3)) {
                try {
                  const imgResponse = await fetch(url)
                  const buffer = await imgResponse.arrayBuffer()
                  const b64 = Buffer.from(buffer).toString('base64')
                  content.push({
                    type: 'image',
                    source: { type: 'base64', media_type: 'image/jpeg', data: b64 }
                  })
                } catch (e) {
                  console.warn('Failed to fetch image:', url, e.message)
                }
              }

              content.push({
                type: 'text',
                text: `
You are an expert UK construction estimator helping a contractor produce a professional cost estimate for works.

Project: ${projectContext?.name ?? 'Unknown'} at ${projectContext?.address ?? 'Unknown'}
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
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                messages: [{ role: 'user', content }]
              })

              let responseText = message.content[0].text
              // Strip markdown code fences if present
              responseText = responseText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
              const draft = JSON.parse(responseText)

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, draft }))
            } catch (error) {
              console.error('AI analysis error:', error)
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: false, error: error.message }))
            }
          })
        }
      }
    ]
  }
})
