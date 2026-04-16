import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Dashboard from '../components/Dashboard'

export default function Home() {
  const [user, setUser] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('company_name')
          .eq('id', user.id)
          .single()
        if (data?.company_name) setCompanyName(data.company_name)
      }
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">{companyName || 'Fast Estimator'}</h1>
        <div className="flex items-center gap-4">
          <Link to="/clients" className="text-sm text-gray-500 hover:text-gray-700">Clients</Link>
          <Link to="/settings" className="text-sm text-gray-500 hover:text-gray-700">Settings</Link>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">Logout</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Estimates</h2>
          <Link
            to="/new-estimate"
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800"
          >
            + New Estimate
          </Link>
        </div>

        <Dashboard userId={user?.id} />
      </main>
    </div>
  )
}
