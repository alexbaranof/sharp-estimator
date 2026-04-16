import { pdf } from '@react-pdf/renderer'
import { createElement } from 'react'
import { supabase } from './supabase'
import EstimateDocument from '../components/PDFDocument'

export async function uploadPDF(estimate, company) {
  const blob = await pdf(createElement(EstimateDocument, { estimate, company })).toBlob()
  const filename = `${estimate.user_id}/${estimate.estimate_number}.pdf`

  const { error } = await supabase.storage
    .from('estimate-pdfs')
    .upload(filename, blob, { contentType: 'application/pdf', upsert: true })

  if (!error) {
    const { data: { publicUrl } } = supabase.storage.from('estimate-pdfs').getPublicUrl(filename)
    await supabase.from('estimates').update({ pdf_url: publicUrl }).eq('id', estimate.id)
    return publicUrl
  }
}
