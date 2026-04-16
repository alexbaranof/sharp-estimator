import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState({
    company_name: '',
    company_address: '',
    company_email: '',
    default_markup: 15,
    logo_url: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) {
      setProfile({
        company_name: data.company_name || '',
        company_address: data.company_address || '',
        company_email: data.company_email || '',
        default_markup: data.default_markup || 15,
        logo_url: data.logo_url || ''
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('user_profiles').upsert({
      id: user.id,
      ...profile
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PNG, JPG, SVG, or WebP image')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be under 2MB')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in first')
        return
      }

      const filename = `logos/${user.id}-${Date.now()}.${file.name.split('.').pop()}`

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('estimate-photos')
        .upload(filename, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('estimate-photos')
        .getPublicUrl(filename)

      // Update profile with logo URL
      setProfile(p => ({ ...p, logo_url: publicUrl }))
      alert('Logo uploaded successfully! Click Save Settings to confirm.')
    } catch (err) {
      console.error('Logo upload error:', err)
      alert(`Failed to upload logo: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">&larr; Back</button>
        <h1 className="text-lg font-bold text-gray-900">Settings</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Company Details</h2>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Company Name</label>
            <input
              type="text"
              value={profile.company_name}
              onChange={e => setProfile(p => ({ ...p, company_name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Company Address</label>
            <textarea
              value={profile.company_address}
              onChange={e => setProfile(p => ({ ...p, company_address: e.target.value }))}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Company Email</label>
            <input
              type="email"
              value={profile.company_email}
              onChange={e => setProfile(p => ({ ...p, company_email: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Default Markup (%)</label>
            <input
              type="number"
              value={profile.default_markup}
              onChange={e => setProfile(p => ({ ...p, default_markup: parseFloat(e.target.value) || 0 }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-3 font-medium">Company Logo</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {profile.logo_url ? (
                <div className="mb-4">
                  <img src={profile.logo_url} alt="Company logo" className="h-16 mx-auto mb-2 rounded" />
                  <p className="text-xs text-gray-500">Current logo</p>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-4xl mb-2">🖼️</p>
                  <p className="text-sm text-gray-500">No logo uploaded</p>
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-input"
              />
              <label
                htmlFor="logo-input"
                className="inline-block bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 cursor-pointer transition-colors"
              >
                {profile.logo_url ? 'Change Logo' : 'Upload Logo'}
              </label>
              <p className="text-xs text-gray-400 mt-2">PNG, JPG, SVG, or WebP — max 2 MB</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </main>
    </div>
  )
}
