import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Clients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [form, setForm] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    address: '',
    vat_number: '',
    notes: ''
  })

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setClients(data || [])
    } catch (err) {
      console.error('Failed to load clients:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Client name is required')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (editingClient) {
        // Update existing client
        await supabase
          .from('clients')
          .update(form)
          .eq('id', editingClient.id)
          .eq('user_id', user.id)
      } else {
        // Insert new client
        await supabase
          .from('clients')
          .insert([{ ...form, user_id: user.id }])
      }

      // Reset form and reload
      setForm({
        name: '',
        company_name: '',
        email: '',
        phone: '',
        address: '',
        vat_number: '',
        notes: ''
      })
      setEditingClient(null)
      setShowForm(false)
      await loadClients()
    } catch (err) {
      console.error('Failed to save client:', err)
      alert('Failed to save client')
    }
  }

  const handleDelete = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client?')) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('user_id', user.id)

      await loadClients()
    } catch (err) {
      console.error('Failed to delete client:', err)
      alert('Failed to delete client')
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEdit = (client) => {
    setEditingClient(client)
    setForm({
      name: client.name,
      company_name: client.company_name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      vat_number: client.vat_number || '',
      notes: client.notes || ''
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingClient(null)
    setForm({
      name: '',
      company_name: '',
      email: '',
      phone: '',
      address: '',
      vat_number: '',
      notes: ''
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">&larr; Back</button>
        <h1 className="text-lg font-bold text-gray-900">Clients</h1>
        <div className="ml-auto flex gap-2">
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-800"
          >
            + New Client
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingClient ? 'Edit Client' : 'New Client'}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Client Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Company Name</label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => setForm(f => ({ ...f, company_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="020 7946 0958"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="123 High Street, London"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">VAT Number</label>
              <input
                type="text"
                value={form.vat_number}
                onChange={(e) => setForm(f => ({ ...f, vat_number: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="GB 123 4567 89"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Any additional notes about this client..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800"
              >
                {editingClient ? 'Update Client' : 'Add Client'}
              </button>
              <button
                onClick={handleCancel}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Clients List */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading clients...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <p className="text-gray-500 mb-4">
              {clients.length === 0 ? 'No clients yet' : 'No clients match your search'}
            </p>
            {clients.length === 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 inline-block"
              >
                Create First Client
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredClients.map((client) => (
              <div key={client.id} className="bg-white rounded-xl shadow p-4 flex items-start justify-between hover:shadow-md transition-shadow">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{client.name}</h3>
                  {client.company_name && (
                    <p className="text-sm text-gray-600">{client.company_name}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                    {client.email && <span>📧 {client.email}</span>}
                    {client.phone && <span>📞 {client.phone}</span>}
                    {client.vat_number && <span>🏢 {client.vat_number}</span>}
                  </div>
                  {client.address && (
                    <p className="text-xs text-gray-500 mt-2">📍 {client.address}</p>
                  )}
                  {client.notes && (
                    <p className="text-xs text-gray-400 mt-2 italic">Notes: {client.notes}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(client)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
