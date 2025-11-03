import { Waves, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

type Wave = {
  number: number
  height: number // meters
  eta: Date
  isStrongest: boolean
}

type MultiWaveTimelineProps = {
  waves: Wave[]
}

export function MultiWaveTimeline({ waves }: MultiWaveTimelineProps) {
  if (waves.length <= 1) return null
  
  const strongestWave = waves.find(w => w.isStrongest) || waves[0]
  
  return (
    <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <h4 className="text-sm font-bold text-red-900">
          ⚠️ MULTIPLE WAVES DETECTED
        </h4>
      </div>
      
      <div className="space-y-2 mb-3">
        {waves.map((wave) => (
          <div 
            key={wave.number}
            className={`flex items-center justify-between p-2 rounded ${
              wave.isStrongest ? 'bg-red-100 border border-red-400' : 'bg-white border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Waves className={`h-4 w-4 ${wave.isStrongest ? 'text-red-700' : 'text-red-500'}`} />
              <span className={`text-sm ${wave.isStrongest ? 'font-bold text-red-900' : 'text-red-700'}`}>
                Wave {wave.number}: {wave.height.toFixed(1)}m
                {wave.isStrongest && ' 🔴 STRONGEST'}
              </span>
            </div>
            <span className="text-xs text-red-600 font-medium">
              ETA: {format(wave.eta, 'h:mm a')}
            </span>
          </div>
        ))}
      </div>
      
      <div className="flex items-start gap-2 p-2 bg-red-900 bg-opacity-10 rounded border-l-4 border-red-700">
        <AlertTriangle className="h-4 w-4 text-red-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-red-900">
          <p className="font-bold mb-1">CRITICAL SAFETY INFORMATION:</p>
          <p>
            Wave {strongestWave.number} ({strongestWave.height.toFixed(1)}m) is the STRONGEST. 
            Do not return to coastal areas after the first wave passes. 
            Stay in safe locations until an ALL CLEAR is issued by authorities.
          </p>
        </div>
      </div>
    </div>
  )
}
