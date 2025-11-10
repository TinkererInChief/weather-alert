'use client'

import { useState } from 'react'
import { Share2, Mail, MessageSquare, Copy, Check } from 'lucide-react'
import { EarthquakeEvent, TsunamiEvent } from '@/types/event-hover'
import { formatDualTime, getEventTime } from '@/lib/time-display'

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
)

type ShareEventButtonProps = {
  event: EarthquakeEvent | TsunamiEvent
}

export default function ShareEventButton({ event }: ShareEventButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const isEarthquake = (e: any): e is EarthquakeEvent => e.magnitude !== undefined

  const getShareContent = () => {
    const title = isEarthquake(event)
      ? `Earthquake Alert: M${event.magnitude} in ${event.location}`
      : `Tsunami Alert: ${event.threatLevel} for ${event.location}`

    // Format time consistently for sharing - always include both UTC and local
    const eventDate = getEventTime(event)
    const timeDisplay = formatDualTime(eventDate, 'event')
    const timeString = `${timeDisplay.primary} (${timeDisplay.secondary})`

    const text = isEarthquake(event)
      ? `A magnitude ${event.magnitude} earthquake occurred at a depth of ${event.depth}km in ${event.location} on ${timeString}.`
      : `A tsunami ${event.threatLevel} alert has been issued for ${event.ocean} affecting ${event.location} on ${timeString}.`

    const url = typeof window !== 'undefined' ? window.location.href : ''

    // Generate map URLs
    const lat = event.latitude ?? 0
    const lng = event.longitude ?? 0
    const zoom = isEarthquake(event) ? Math.min(12, Math.max(6, 12 - event.magnitude)) : 8
    
    // Interactive OpenStreetMap link
    const interactiveMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`
    
    // Use OpenStreetMap static image via tile.openstreetmap.org
    // We'll use a simple approach: link to the interactive map as the "static" URL
    // Email clients and WhatsApp will show a link preview
    // For a true static image, users would need to set up their own tile server or use a service
    const staticMapUrl = interactiveMapUrl

    // Consistent format for all sharing methods
    const latStr = lat.toFixed(4)
    const lngStr = lng.toFixed(4)
    const latDir = lat >= 0 ? 'N' : 'S'
    const lngDir = lng >= 0 ? 'E' : 'W'
    
    const fullText = `${title}

${text}

📍 Location: ${latStr}°${latDir}, ${lngStr}°${lngDir}

🗺️ View Map: ${interactiveMapUrl}

🔗 More Details: ${url}`

    return { 
      title, 
      text, 
      url, 
      interactiveMapUrl,
      staticMapUrl,
      fullText
    }
  }

  const handleEmail = () => {
    const { title, text, interactiveMapUrl, url } = getShareContent()
    
    // Plain text email with map link
    const emailBody = `${text}

📍 Location: ${event.latitude?.toFixed(4)}°${(event.latitude ?? 0) >= 0 ? 'N' : 'S'}, ${event.longitude?.toFixed(4)}°${(event.longitude ?? 0) >= 0 ? 'E' : 'W'}

🗺️ View Map: ${interactiveMapUrl}

🔗 More Details: ${url}`
    
    const mailtoLink = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(emailBody)}`
    window.location.href = mailtoLink
    setIsOpen(false)
  }

  const handleSMS = () => {
    const { text, interactiveMapUrl, url } = getShareContent()
    const lat = event.latitude ?? 0
    const lng = event.longitude ?? 0
    // SMS with map link
    const smsText = `${text}\n\n📍 ${lat.toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${lng.toFixed(4)}°${lng >= 0 ? 'E' : 'W'}\n\n🗺️ Map: ${interactiveMapUrl}\n\n🔗 Details: ${url}`
    const smsLink = `sms:?&body=${encodeURIComponent(smsText)}`
    window.location.href = smsLink
    setIsOpen(false)
  }

  const handleWhatsApp = () => {
    const { text, interactiveMapUrl, url } = getShareContent()
    const lat = event.latitude ?? 0
    const lng = event.longitude ?? 0
    // WhatsApp with map link (WhatsApp will show link preview)
    const whatsappText = `${text}\n\n📍 ${lat.toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${lng.toFixed(4)}°${lng >= 0 ? 'E' : 'W'}\n\n🗺️ Map: ${interactiveMapUrl}\n\n🔗 Details: ${url}`
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`
    window.open(whatsappLink, '_blank')
    setIsOpen(false)
  }

  const handleCopyLink = async () => {
    const { fullText } = getShareContent()
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setIsOpen(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share Event Details
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50">
            <button
              onClick={handleEmail}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
            >
              <Mail className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-900">Email</span>
            </button>
            
            <button
              onClick={handleSMS}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
            >
              <MessageSquare className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-slate-900">SMS</span>
            </button>
            
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
            >
              <WhatsAppIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-slate-900">WhatsApp</span>
            </button>
            
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
            >
              {copied ? (
                <>
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5 text-slate-600" />
                  <span className="text-sm font-medium text-slate-900">Copy Link</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
