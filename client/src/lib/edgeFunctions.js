import { supabase } from './supabase'

export async function analyseEstimate({ description, photoUrls, projectContext }) {
  const response = await fetch('/api/analyse-estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, photoUrls, projectContext })
  })

  const data = await response.json()
  console.log('AI response:', data)

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'AI analysis failed')
  }

  return data.draft
}

export async function sendEstimateEmail(estimateId) {
  const { data, error } = await supabase.functions.invoke('send-estimate-email', {
    body: { estimateId }
  })
  if (error) throw error
  return data
}
