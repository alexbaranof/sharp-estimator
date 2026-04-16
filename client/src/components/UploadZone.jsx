import { useState } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabase'

export default function UploadZone({ photos, onPhotosChange }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleFiles = async (files) => {
    setUploading(true)
    setUploadError('')
    const newPhotos = []

    for (const file of Array.from(files).slice(0, 3 - photos.length)) {
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920
        })

        // Create local preview immediately
        const localUrl = URL.createObjectURL(compressed)

        // Try uploading to Supabase storage
        const filename = `${Date.now()}-${file.name}`
        const { error } = await supabase.storage
          .from('vo-photos')
          .upload(filename, compressed)

        let remoteUrl = null
        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('vo-photos')
            .getPublicUrl(filename)
          remoteUrl = publicUrl
        }

        newPhotos.push({
          id: crypto.randomUUID(),
          localUrl,
          remoteUrl,
          name: file.name
        })
      } catch (err) {
        console.error('Photo processing error:', err)
        setUploadError('Failed to process one or more photos')
      }
    }

    setUploading(false)
    onPhotosChange([...photos, ...newPhotos])
  }

  const removePhoto = (id) => {
    const photo = photos.find(p => p.id === id)
    if (photo?.localUrl) URL.revokeObjectURL(photo.localUrl)
    onPhotosChange(photos.filter(p => p.id !== id))
  }

  const remaining = 3 - photos.length

  return (
    <div className="space-y-4">
      {/* Upload area */}
      {remaining > 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={e => handleFiles(e.target.files)}
            className="hidden"
            id="photo-input"
          />
          <label htmlFor="photo-input" className="cursor-pointer">
            <div className="text-4xl mb-2">&#128247;</div>
            <p className="font-medium">Tap to take photos or upload</p>
            <p className="text-sm text-gray-400 mt-1">{remaining} photo{remaining !== 1 ? 's' : ''} remaining &middot; JPEG/PNG</p>
          </label>
          {uploading && <p className="mt-4 text-blue-600 animate-pulse">Processing photos...</p>}
          {uploadError && <p className="mt-2 text-red-500 text-sm">{uploadError}</p>}
        </div>
      )}

      {/* Photo previews */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">{photos.length} photo{photos.length !== 1 ? 's' : ''} added</p>
          <div className="flex gap-3 flex-wrap">
            {photos.map(photo => (
              <div key={photo.id} className="relative group">
                <img
                  src={photo.localUrl}
                  alt={photo.name}
                  className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center shadow hover:bg-red-600"
                >
                  &#10005;
                </button>
                <p className="text-xs text-gray-400 mt-1 truncate w-24">{photo.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
