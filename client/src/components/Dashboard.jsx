import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const statusConfig = {
  draft:    { label: 'Draft',    bg: 'bg-gray-100',   text: 'text-gray-600'  },
  sent:     { label: 'Sent',     bg: 'bg-blue-100',   text: 'text-blue-700'  },
  accepted: { label: 'Accepted', bg: 'bg-green-100',  text: 'text-green-700' },
  declined: { label: 'Declined', bg: 'bg-red-100',    text: 'text-red-700'   },
}

export default function Dashboard({ userId }) {
  const [estimates, setEstimates] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) loadEstimates()
  }, [userId])

  const loadEstimates = async () => {
    const { data } = await supabase
      .from('estimates')
      .select('*, projects(name, client_name, address)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setEstimates(data)
    setLoading(false)
  }

  const filtered = filter === 'all' ? estimates : estimates.filter(e => e.status === filter)

  // Summary stats
  const totalValue = estimates.reduce((sum, e) => sum + (e.total_inc_vat ?? 0), 0)
  const awaitingResponse = estimates.filter(e => e.status === 'sent').length
  const acceptedThisMonth = estimates.filter(e => {
    return e.status === 'accepted' &&
      new Date(e.accepted_at) > new Date(new Date().setDate(1))
  }).length

  if (loading) return <div className="text-gray-400 text-center py-8">Loading...</div>

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Total Estimates</p>
          <p className="text-2xl font-bold text-gray-900">{estimates.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Total Value</p>
          <p className="text-2xl font-bold text-gray-900">&pound;{totalValue.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Awaiting</p>
          <p className="text-2xl font-bold text-blue-700">{awaitingResponse}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['all', 'draft', 'sent', 'accepted', 'declined'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              filter === s
                ? 'bg-blue-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'All' : statusConfig[s]?.label}
          </button>
        ))}
      </div>

      {/* Estimate list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">No estimates yet</p>
          <p className="text-sm">Create your first estimate to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(estimate => {
            const status = statusConfig[estimate.status] || statusConfig.draft
            return (
              <Link
                key={estimate.id}
                to={`/estimate/${estimate.id}`}
                className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{estimate.estimate_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{estimate.title}</p>
                    <p className="text-xs text-gray-400">{estimate.projects?.name} &middot; {estimate.projects?.client_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">&pound;{estimate.total_inc_vat?.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{new Date(estimate.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
