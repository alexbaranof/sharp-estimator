import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ClientReview() {
  const { token } = useParams()
  const [estimate, setEstimate] = useState(null)
  const [responded, setResponded] = useState(false)
  const [response, setResponse] = useState('')
  const [declineReason, setDeclineReason] = useState('')

  useEffect(() => {
    supabase
      .from('estimates')
      .select('*, projects(*)')
      .eq('review_token', token)
      .single()
      .then(({ data }) => setEstimate(data))
  }, [token])

  const handleAccept = async () => {
    await supabase.from('estimates').update({
      status: 'accepted',
      accepted_at: new Date().toISOString()
    }).eq('review_token', token)

    setResponse('accepted')
    setResponded(true)
  }

  const handleDecline = async () => {
    await supabase.from('estimates').update({
      status: 'declined',
      decline_reason: declineReason
    }).eq('review_token', token)

    setResponse('declined')
    setResponded(true)
  }

  if (!estimate) return <div className="p-8 text-center text-gray-400">Loading...</div>

  if (responded) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        {response === 'accepted' ? (
          <>
            <div className="text-4xl mb-4">&#10003;</div>
            <p className="text-green-600 text-lg font-semibold">Estimate accepted. Thank you!</p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">&#10005;</div>
            <p className="text-red-600 text-lg font-semibold">Estimate declined. Thank you for your response.</p>
          </>
        )}
      </div>
    </div>
  )

  const validUntil = new Date(estimate.created_at)
  validUntil.setDate(validUntil.getDate() + (estimate.validity_days || 30))

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-lg w-full mx-auto p-6 bg-white rounded-xl shadow">
        <h1 className="text-xl font-bold mb-2">{estimate.estimate_number}: {estimate.title}</h1>
        <p className="text-gray-500 mb-2">Project: {estimate.projects?.name}</p>
        <p className="text-xs text-gray-400 mb-4">Valid until: {validUntil.toLocaleDateString('en-GB')}</p>

        <p className="text-sm text-gray-600 mb-4">{estimate.scope}</p>

        {/* Line items summary */}
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-2 py-1">Item</th>
                <th className="text-right px-2 py-1">Qty</th>
                <th className="text-right px-2 py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {estimate.line_items?.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-2 py-1">{item.description}</td>
                  <td className="text-right px-2 py-1">{item.qty} {item.unit}</td>
                  <td className="text-right px-2 py-1">&pound;{(item.qty * item.rate)?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mb-6 font-semibold">Total inc VAT: &pound;{estimate.total_inc_vat?.toFixed(2)}</p>

        {estimate.time_estimate > 0 && (
          <p className="text-sm text-gray-500 mb-4">Estimated duration: {estimate.time_estimate} working days</p>
        )}

        {/* Accept / Decline */}
        <div className="space-y-3">
          <button
            onClick={handleAccept}
            className="w-full bg-blue-700 text-white rounded-lg py-3 font-semibold hover:bg-blue-800"
          >
            Accept Estimate
          </button>

          <div>
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              rows={2}
              placeholder="Reason for declining (optional)..."
              className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
            />
            <button
              onClick={handleDecline}
              className="w-full border border-red-300 text-red-600 rounded-lg py-2 text-sm font-medium hover:bg-red-50"
            >
              Decline Estimate
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
