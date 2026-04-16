import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import { supabase } from '../lib/supabase'
import { sendEstimateEmail } from '../lib/edgeFunctions'
import { uploadPDF } from '../lib/pdfUtils'
import EstimateDocument from '../components/PDFDocument'

const statusConfig = {
  draft:    { label: 'Draft',    bg: 'bg-gray-100',   text: 'text-gray-600'  },
  sent:     { label: 'Sent',     bg: 'bg-blue-100',   text: 'text-blue-700'  },
  accepted: { label: 'Accepted', bg: 'bg-green-100',  text: 'text-green-700' },
  declined: { label: 'Declined', bg: 'bg-red-100',    text: 'text-red-700'   },
}

export default function EstimateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [estimate, setEstimate] = useState(null)
  const [company, setCompany] = useState({})
  const [photos, setPhotos] = useState([])
  const [showPDF, setShowPDF] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadEstimate()
    loadCompany()
    loadPhotos()
  }, [id])

  const loadEstimate = async () => {
    const { data } = await supabase
      .from('estimates')
      .select('*, projects(*)')
      .eq('id', id)
      .single()
    setEstimate(data)
  }

  const loadCompany = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) setCompany({
        name: data.company_name,
        address: data.company_address,
        email: data.company_email,
        logo: data.logo_url
      })
    }
  }

  const loadPhotos = async () => {
    const { data } = await supabase
      .from('estimate_photos')
      .select('*')
      .eq('estimate_id', id)
    if (data) setPhotos(data)
  }

  const handleSendToClient = async () => {
    if (!estimate.projects?.client_email) {
      alert('Please set a client email in the project settings first.')
      return
    }
    setSending(true)
    try {
      // Upload PDF first
      await uploadPDF(estimate, company)
      // Send email
      await sendEstimateEmail(estimate.id)
      await loadEstimate()
    } catch (err) {
      console.error('Failed to send:', err)
      alert('Failed to send email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (!estimate) return <div className="p-8 text-center text-gray-400">Loading...</div>

  const status = statusConfig[estimate.status] || statusConfig.draft
  const validUntil = new Date(estimate.created_at)
  validUntil.setDate(validUntil.getDate() + (estimate.validity_days || 30))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">&larr; Back</button>
        <h1 className="text-lg font-bold text-gray-900">{estimate.estimate_number}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Summary card */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{estimate.title}</h2>
          <p className="text-sm text-gray-500 mb-4">
            Project: {estimate.projects?.name} &middot; {estimate.projects?.client_name}
          </p>
          <p className="text-sm text-gray-600 mb-3">{estimate.scope}</p>
          <p className="text-xs text-gray-400 mb-4">Valid until: {validUntil.toLocaleDateString('en-GB')}</p>

          {/* Line items */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="text-right px-3 py-2">Qty</th>
                  <th className="text-center px-3 py-2">Unit</th>
                  <th className="text-right px-3 py-2">Rate</th>
                  <th className="text-right px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {estimate.line_items?.map((item, i) => (
                  <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="text-right px-3 py-2">{item.qty}</td>
                    <td className="text-center px-3 py-2">{item.unit}</td>
                    <td className="text-right px-3 py-2">&pound;{item.rate?.toFixed(2)}</td>
                    <td className="text-right px-3 py-2">&pound;{(item.qty * item.rate)?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 text-right text-sm space-y-1">
            <p>Subtotal: <strong>&pound;{estimate.subtotal?.toFixed(2)}</strong></p>
            <p>Markup ({estimate.markup_pct}%): <strong>&pound;{(estimate.subtotal * estimate.markup_pct / 100)?.toFixed(2)}</strong></p>
            <p>VAT ({estimate.vat_pct}%): <strong>&pound;{((estimate.subtotal * (1 + estimate.markup_pct / 100)) * estimate.vat_pct / 100)?.toFixed(2)}</strong></p>
            <p className="text-base font-bold">Total inc VAT: <span className="text-blue-700">&pound;{estimate.total_inc_vat?.toFixed(2)}</span></p>
          </div>

          {estimate.time_estimate > 0 && (
            <p className="mt-3 text-sm text-gray-500">Estimated duration: {estimate.time_estimate} working days</p>
          )}
          {estimate.notes && (
            <p className="mt-2 text-sm text-gray-500"><strong>Notes:</strong> {estimate.notes}</p>
          )}
        </div>

        {/* Photos */}
        {photos.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Photos</h3>
            <div className="flex gap-3 flex-wrap">
              {photos.map(p => (
                <img key={p.id} src={p.url} alt={p.caption || ''} className="w-32 h-32 object-cover rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {/* Client response */}
        {estimate.status === 'accepted' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-semibold text-green-700 mb-2">Estimate Accepted</h3>
            <p className="text-xs text-gray-400">Accepted at: {new Date(estimate.accepted_at).toLocaleString('en-GB')}</p>
          </div>
        )}
        {estimate.status === 'declined' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-semibold text-red-700 mb-2">Estimate Declined</h3>
            {estimate.decline_reason && (
              <p className="text-sm text-gray-600">{estimate.decline_reason}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <PDFDownloadLink
            document={<EstimateDocument estimate={estimate} company={company} />}
            fileName={`${estimate.estimate_number}.pdf`}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900"
          >
            {({ loading }) => loading ? 'Generating...' : 'Download PDF'}
          </PDFDownloadLink>

          <button
            onClick={() => setShowPDF(!showPDF)}
            className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {showPDF ? 'Hide Preview' : 'Preview PDF'}
          </button>

          {estimate.status === 'draft' && (
            <button
              onClick={handleSendToClient}
              disabled={sending}
              className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send to Client'}
            </button>
          )}
        </div>

        {/* PDF Preview */}
        {showPDF && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <PDFViewer width="100%" height={600}>
              <EstimateDocument estimate={estimate} company={company} />
            </PDFViewer>
          </div>
        )}
      </main>
    </div>
  )
}
