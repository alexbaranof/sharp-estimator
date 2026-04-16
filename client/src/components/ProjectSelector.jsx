import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ProjectSelector({ userId, onSelect }) {
  const [projects, setProjects] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    client_name: '',
    client_email: '',
    address: ''
  })

  useEffect(() => {
    if (userId) loadProjects()
  }, [userId])

  const loadProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setProjects(data)
  }

  const handleCreate = async () => {
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...newProject, user_id: userId })
      .select()
      .single()
    if (!error && data) {
      setProjects(prev => [data, ...prev])
      onSelect(data)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Select a project</h3>

      {projects.length > 0 && (
        <div className="space-y-2">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full text-left bg-white border rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <p className="font-medium text-gray-900">{p.name}</p>
              <p className="text-sm text-gray-500">{p.client_name} &middot; {p.address}</p>
            </button>
          ))}
        </div>
      )}

      {!showNew ? (
        <button
          onClick={() => setShowNew(true)}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
        >
          + Create new project
        </button>
      ) : (
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">New Project</h4>
          <input
            type="text"
            placeholder="Project name"
            value={newProject.name}
            onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Client name"
            value={newProject.client_name}
            onChange={e => setNewProject(p => ({ ...p, client_name: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Client email"
            value={newProject.client_email}
            onChange={e => setNewProject(p => ({ ...p, client_email: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Site address"
            value={newProject.address}
            onChange={e => setNewProject(p => ({ ...p, address: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowNew(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newProject.name.trim()}
              className="flex-1 bg-blue-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              Create & Select
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
