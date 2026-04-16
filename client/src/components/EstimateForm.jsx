import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const UNITS = ['nr', 'm2', 'm', 'hrs', 'sum']

function createEmptyItem() {
  return {
    id: crypto.randomUUID(),
    description: '',
    qty: 1,
    unit: 'nr',
    rate: 0,
    total: 0
  }
}

export default function EstimateForm({ aiDraft, project, onBack, onSave, onFinish }) {
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('')
  const [lineItems, setLineItems] = useState([createEmptyItem()])
  const [markupPct, setMarkupPct] = useState(15)
  const [vatPct, setVatPct] = useState(20)
  const [timeEstimate, setTimeEstimate] = useState(0)
  const [notes, setNotes] = useState('')
  const [validity, setValidity] = useState(30)
  const [saveStatus, setSaveStatus] = useState('')
  const timer = useRef(null)

  // Load AI draft data
  useEffect(() => {
    if (aiDraft) {
      setTitle(aiDraft.title || '')
      setScope(aiDraft.scope || aiDraft.description || '')
      setTimeEstimate(aiDraft.time_estimate || 0)
      setNotes(aiDraft.notes || '')
      if (aiDraft.line_items?.length) {
        setLineItems(aiDraft.line_items.map(item => ({
          id: crypto.randomUUID(),
          description: item.description || '',
          qty: item.qty || 1,
          unit: item.unit || 'nr',
          rate: item.rate || 0,
          total: (item.qty || 1) * (item.rate || 0)
        })))
      }
    }
  }, [aiDraft])

  // Load default markup from profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('user_profiles').select('default_markup').eq('id', user.id).single()
          .then(({ data }) => {
            if (data?.default_markup) setMarkupPct(data.default_markup)
          })
      }
    })
  }, [])

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.qty * item.rate, 0)
  const markupAmount = subtotal * (markupPct / 100)
  const subtotalWithMarkup = subtotal + markupAmount
  const vatAmount = subtotalWithMarkup * (vatPct / 100)
  const totalIncVat = subtotalWithMarkup + vatAmount

  // Line item helpers
  const updateItem = (itemId, field, value) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      const updated = { ...item, [field]: value }
      updated.total = updated.qty * updated.rate
      return updated
    }))
  }

  const addItem = () => setLineItems(prev => [...prev, createEmptyItem()])

  const removeItem = (itemId) => {
    if (lineItems.length <= 1) return
    setLineItems(prev => prev.filter(item => item.id !== itemId))
  }

  const getEstimateData = () => ({
    title: title,
    scope: scope,
    line_items: lineItems,
    subtotal: subtotal,
    markup_pct: markupPct,
    vat_pct: vatPct,
    total_inc_vat: totalIncVat,
    time_estimate: timeEstimate,
    notes: notes,
    validity_days: validity
  })

  // Autosave
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSaveStatus('Saving...')
      await onSave(getEstimateData())
      setSaveStatus('Saved')
      setTimeout(() => setSaveStatus(''), 2000)
    }, 3000)
    return () => clearTimeout(timer.current)
  }, [title, scope, lineItems, markupPct, vatPct, timeEstimate, notes, validity])

  return (
    <div className="space-y-6">
      {/* Save indicator */}
      {saveStatus && (
        <div className="text-right text-xs text-gray-400">{saveStatus}</div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Estimate Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Kitchen Renovation — Labour & Materials"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Scope of Work */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Scope of Work</label>
        <textarea
          value={scope}
          onChange={e => setScope(e.target.value)}
          rows={3}
          placeholder="Describe the work to be carried out..."
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Line Items</label>
          <button onClick={addItem} className="text-xs text-blue-700 hover:text-blue-800 font-medium">+ Add Row</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-2 py-2 min-w-[200px]">Description</th>
                <th className="text-right px-2 py-2 w-16">Qty</th>
                <th className="text-center px-2 py-2 w-20">Unit</th>
                <th className="text-right px-2 py-2 w-24">Rate (&pound;)</th>
                <th className="text-right px-2 py-2 w-24">Total (&pound;)</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map(item => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="px-1 py-1">
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={e => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-2 py-1 text-sm text-right"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <select
                      value={item.unit}
                      onChange={e => updateItem(item.id, 'unit', e.target.value)}
                      className="w-full border rounded px-1 py-1 text-sm"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={item.rate}
                      onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-2 py-1 text-sm text-right"
                    />
                  </td>
                  <td className="px-2 py-1 text-right text-sm font-medium">
                    &pound;{(item.qty * item.rate).toFixed(2)}
                  </td>
                  <td className="px-1 py-1">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-400 hover:text-red-600 text-sm"
                      title="Remove"
                    >&#10005;</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Markup & VAT */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Markup (%)</label>
          <input
            type="number"
            step="0.5"
            value={markupPct}
            onChange={e => setMarkupPct(parseFloat(e.target.value) || 0)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">VAT (%)</label>
          <input
            type="number"
            step="0.5"
            value={vatPct}
            onChange={e => setVatPct(parseFloat(e.target.value) || 0)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Time estimate & Validity */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration (days)</label>
          <input
            type="number"
            value={timeEstimate}
            onChange={e => setTimeEstimate(parseInt(e.target.value) || 0)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quote Valid For (days)</label>
          <input
            type="number"
            value={validity}
            onChange={e => setValidity(parseInt(e.target.value) || 30)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Assumptions</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Any exclusions, assumptions, or additional notes..."
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Grand Totals */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1 text-right">
        <p>Subtotal: <strong>&pound;{subtotal.toFixed(2)}</strong></p>
        <p>Markup ({markupPct}%): <strong>&pound;{markupAmount.toFixed(2)}</strong></p>
        <p>VAT ({vatPct}%): <strong>&pound;{vatAmount.toFixed(2)}</strong></p>
        <p className="text-base font-bold text-blue-700 pt-1 border-t border-gray-200">
          Total inc VAT: &pound;{totalIncVat.toFixed(2)}
        </p>
        {timeEstimate > 0 && (
          <p className="text-xs text-gray-500">Estimated duration: {timeEstimate} working days</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2 border rounded-lg text-sm text-gray-600"
        >
          Back
        </button>
        <button
          onClick={() => onFinish(getEstimateData())}
          className="flex-1 bg-blue-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800"
        >
          Save Estimate
        </button>
      </div>
    </div>
  )
}
