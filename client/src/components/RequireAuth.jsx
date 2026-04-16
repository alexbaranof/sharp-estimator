import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RequireAuth({ children }) {
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login')
      setLoading(false)
    }).catch((err) => {
      console.error('Auth error:', err)
      navigate('/login')
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>
  return children
}
