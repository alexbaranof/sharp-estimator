import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { analyseEstimate } from '../lib/edgeFunctions'
import UploadZone from '../components/UploadZone'
import EstimateForm from '../components/EstimateForm'
import ProjectSelector from '../components/ProjectSelector'

export default function NewEstimate() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [user, setUser] = useState(null)
  const [project, setProject] = useState(null)
  const [photos, setPhotos] = useState([])
  const [description, setDescription] = useState('')
  const [aiDraft, setAiDraft] = useState(null)
  const [analysing, setAnalysing] = useState(false)
  const [estimateId, setEstimateId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  const handleAnalyse = async () => {
    setAnalysing(true)
    try {
      const photoUrls = photos.map(p => p.remoteUrl).filter(Boolean)
      const draft = await analyseEstimate({
        description,
        photoUrls,
        projectContext: project
      })
      console.log('AI draft received:', draft)
      setAiDraft(draft)
      setStep(3)
    } catch (err) {
      console.error('AI analysis failed:', err)
      alert('AI analysis failed: ' + (err?.message || 'Unknown error. Check console for details.'))
      setAiDraft(null)
      setStep(3)
    } finally {
      setAnalysing(false)
    }
  }

  const handleSaveEstimate = async (estimateData) => {
    // Generate estimate number
    const { data: existing } = await supabase
      .from('estimates')
      .select('estimate_number')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const lastNum = existing?.[0]?.estimate_number
      ? parseInt(existing[0].estimate_number.replace('EST-', ''))
      : 0
    const estimateNumber = `EST-${String(lastNum + 1).padStart(3, '0')}`

    const record = {
      project_id: project.id,
      user_id: user.id,
      estimate_number: estimateNumber,
      title: estimateData.title,
      scope: estimateData.scope,
      ai_draft: aiDraft,
      line_items: estimateData.line_items,
      subtotal: estimateData.subtotal,
      markup_pct: estimateData.markup_pct,
      vat_pct: estimateData.vat_pct,
      total_inc_vat: estimateData.total_inc_vat,
      time_estimate: estimateData.time_estimate,
      validity_days: estimateData.validity_days,
      notes: estimateData.notes,
      status: 'draft'
    }

    if (estimateId) {
      await supabase.from('estimates').update({ ...record, updated_at: new Date().toISOString() }).eq('id', estimateId)
    } else {
      const { data } = await supabase.from('estimates').insert(record).select().single()
      if (data) {
        setEstimateId(data.id)
        // Save photo references
        for (const photo of photos) {
          if (photo.remoteUrl) {
            await supabase.from('estimate_photos').insert({ estimate_id: data.id, url: photo.remoteUrl })
          }
        }
      }
    }
  }

  const handleFinish = async (estimateData) => {
    await handleSaveEstimate(estimateData)
    navigate(estimateId ? `/estimate/${estimateId}` : '/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">&larr; Back</button>
        <h1 className="text-lg font-bold text-gray-900">New Estimate</h1>
      </header>

      {/* Progress steps */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{s}</div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-blue-700' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <span className="ml-2 text-sm text-gray-500">
            {step === 1 && 'Select Project'}
            {step === 2 && 'Photos & Description'}
            {step === 3 && 'Review & Edit'}
          </span>
        </div>

        {/* Step 1: Project Selection */}
        {step === 1 && (
          <div>
            <ProjectSelector
              userId={user?.id}
              onSelect={(p) => { setProject(p); setStep(2) }}
            />
          </div>
        )}

        {/* Step 2: Photos & Description */}
        {step === 2 && (
          <div className="space-y-6">
            <UploadZone photos={photos} onPhotosChange={setPhotos} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe the work to estimate
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="e.g. Client wants a full kitchen renovation including new cabinets, worktops, tiling, plumbing and electrics..."
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600"
              >
                Back
              </button>
              <button
                onClick={handleAnalyse}
                disabled={analysing || !description.trim()}
                className="flex-1 bg-blue-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
              >
                {analysing ? 'Estimating with AI...' : 'Estimate with AI'}
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600"
              >
                Skip AI
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Estimate Form */}
        {step === 3 && (
          <EstimateForm
            aiDraft={aiDraft}
            project={project}
            onBack={() => setStep(2)}
            onSave={handleSaveEstimate}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  )
}
