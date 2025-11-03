import { CheckCircle, Waves } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type DartConfirmation = {
  stationId: string
  stationName: string
  height: number // meters
  timestamp: Date
  region: string
}

type WaveConfirmationBadgeProps = {
  confirmation: DartConfirmation
  variant?: 'compact' | 'full'
}

export function WaveConfirmationBadge({ confirmation, variant = 'full' }: WaveConfirmationBadgeProps) {
  const timeAgo = formatDistanceToNow(confirmation.timestamp, { addSuffix: true })
  
  if (variant === 'compact') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs">
        <CheckCircle className="h-3 w-3 text-green-600" />
        <span className="font-medium text-green-900">Wave Confirmed</span>
      </div>
    )
  }
  
  return (
    <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex-shrink-0">
        <div className="relative">
          <Waves className="h-6 w-6 text-green-600" />
          <CheckCircle className="h-3 w-3 text-green-600 absolute -bottom-1 -right-1 bg-green-50 rounded-full" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-green-900">
            ✅ WAVE CONFIRMED BY SENSORS
          </span>
        </div>
        
        <div className="space-y-0.5 text-xs text-green-700">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              <strong>Station:</strong> {confirmation.stationName}
            </span>
            <span>
              <strong>Height:</strong> {confirmation.height.toFixed(1)}m
            </span>
            <span>
              <strong>Detected:</strong> {timeAgo}
            </span>
          </div>
          <div>
            <strong>Location:</strong> {confirmation.region}
          </div>
        </div>
      </div>
    </div>
  )
}
