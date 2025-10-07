"use client"

import { Target, Info } from 'lucide-react'
import type { MaritimeImpactScore } from '@/lib/maritime-impact-scorer'
import InfoTooltip from '@/components/ui/InfoTooltip'

type ImpactScoreBreakdownProps = {
  score: MaritimeImpactScore
}

function ScoreMeter({ value, max, label, details, helpContent }: { 
  value: number
  max: number
  label: string
  details?: string[]
  helpContent?: React.ReactNode
}) {
  const percentage = (value / max) * 100
  const color = 
    percentage >= 80 ? 'bg-red-500' : 
    percentage >= 60 ? 'bg-orange-500' : 
    percentage >= 40 ? 'bg-amber-500' : 
    'bg-slate-400'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-700">{label}</span>
          {helpContent && <InfoTooltip content={helpContent} side="right" />}
        </div>
        <span className="text-sm font-bold text-slate-900">
          {value}<span className="text-xs text-slate-500">/{max}</span>
        </span>
      </div>
      
      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {details && details.length > 0 && (
        <div className="ml-2 space-y-0.5 text-[10px] text-slate-600">
          {details.map((detail, idx) => (
            <div key={idx}>• {detail}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ImpactScoreBreakdown({ score }: ImpactScoreBreakdownProps) {
  const geographicDetails: string[] = []
  
  // Proximity to shipping
  const proximityScore = score.factors.proximityToShipping
  if (proximityScore > 15) {
    geographicDetails.push('Very close to major shipping lanes')
  } else if (proximityScore > 10) {
    geographicDetails.push('Near major shipping routes')
  } else if (proximityScore > 5) {
    geographicDetails.push('Moderate proximity to shipping')
  } else {
    geographicDetails.push('Distant from major shipping routes')
  }

  const severityDetails: string[] = []
  const magnitudeScore = score.factors.magnitude
  severityDetails.push(`Magnitude impact: ${magnitudeScore}/30 points`)
  
  const tsunamiScore = score.factors.tsunamiRisk
  if (tsunamiScore > 20) {
    severityDetails.push('Tsunami warning active ⚠️')
  } else if (tsunamiScore > 10) {
    severityDetails.push('Tsunami risk present')
  } else if (tsunamiScore > 0) {
    severityDetails.push('Minor tsunami risk')
  }

  const assetDetails: string[] = []
  if (score.affectedAssets.nearbyPorts.length > 0) {
    assetDetails.push(`${score.affectedAssets.nearbyPorts.length} port${score.affectedAssets.nearbyPorts.length > 1 ? 's' : ''} affected`)
  }
  if (score.affectedAssets.shippingLanes.length > 0) {
    assetDetails.push(`${score.affectedAssets.shippingLanes.length} shipping lane${score.affectedAssets.shippingLanes.length > 1 ? 's' : ''}`)
  }
  if (score.affectedAssets.nearbyPorts.length === 0 && score.affectedAssets.shippingLanes.length === 0) {
    assetDetails.push('No major assets in immediate vicinity')
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          Impact Score Breakdown
        </h3>
        <div className="text-right">
          <div className="text-2xl font-black text-slate-900">
            {score.totalScore}
            <span className="text-sm text-slate-500 font-normal">/100</span>
          </div>
          <div className={`text-[10px] font-bold uppercase tracking-wide ${
            score.priority === 'critical' ? 'text-red-600' :
            score.priority === 'high' ? 'text-orange-600' :
            score.priority === 'medium' ? 'text-amber-600' :
            score.priority === 'low' ? 'text-blue-600' :
            'text-slate-600'
          }`}>
            {score.priority}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <ScoreMeter 
          value={score.factors.proximityToShipping} 
          max={25} 
          label="Proximity to Shipping" 
          details={geographicDetails}
          helpContent={
            <div className="space-y-2">
              <p className="font-semibold">How This Is Calculated</p>
              <p>Based on distance to nearest major shipping lane, weighted by lane importance (1-10):</p>
              <ul className="ml-3 space-y-1 text-slate-300">
                <li>• &lt;50km: 20-25 points</li>
                <li>• 50-100km: 15-20 points</li>
                <li>• 100-200km: 10-15 points</li>
                <li>• 200-500km: 5-10 points</li>
                <li>• &gt;500km: 0-5 points</li>
              </ul>
              <p className="text-slate-400 text-[10px] italic pt-1 border-t border-slate-700">
                Major lanes: Trans-Pacific, Malacca Strait, Japan Coastal
              </p>
            </div>
          }
        />

        <ScoreMeter 
          value={score.factors.magnitude} 
          max={30} 
          label="Event Severity" 
          details={severityDetails}
          helpContent={
            <div className="space-y-2">
              <p className="font-semibold">How This Is Calculated</p>
              <p>Based on earthquake magnitude on the Richter scale:</p>
              <ul className="ml-3 space-y-1 text-slate-300">
                <li>• M8.0+: 30 points (catastrophic)</li>
                <li>• M7.0-7.9: 25-29 points (major)</li>
                <li>• M6.0-6.9: 15-24 points (strong)</li>
                <li>• M5.0-5.9: 8-14 points (moderate)</li>
                <li>• &lt;M5.0: 0-7 points (light)</li>
              </ul>
              <p className="text-slate-400 text-[10px] italic pt-1 border-t border-slate-700">
                Logarithmic scale: M7.0 is 10x stronger than M6.0
              </p>
            </div>
          }
        />

        <ScoreMeter 
          value={score.factors.portDensity} 
          max={15} 
          label="Port Impact" 
          details={assetDetails}
          helpContent={
            <div className="space-y-2">
              <p className="font-semibold">How This Is Calculated</p>
              <p>Based on number and importance of ports within 500km radius:</p>
              <ul className="ml-3 space-y-1 text-slate-300">
                <li>• Major port &lt;100km: 10-15 points</li>
                <li>• Major port 100-300km: 5-10 points</li>
                <li>• Regional port &lt;200km: 3-7 points</li>
                <li>• Multiple ports: cumulative bonus</li>
                <li>• No nearby ports: 0 points</li>
              </ul>
              <p className="text-slate-400 text-[10px] italic pt-1 border-t border-slate-700">
                Major ports: Singapore, Shanghai, Tokyo, Rotterdam, LA
              </p>
            </div>
          }
        />

        <ScoreMeter 
          value={score.factors.tsunamiRisk} 
          max={25} 
          label="Tsunami Risk" 
          details={tsunamiScore > 0 ? [`Risk level: ${tsunamiScore}/25 points`] : ['No tsunami risk']}
          helpContent={
            <div className="space-y-2">
              <p className="font-semibold">How This Is Calculated</p>
              <p>Multi-factor tsunami risk assessment:</p>
              <ul className="ml-3 space-y-1 text-slate-300">
                <li>• <strong>Warning Active:</strong> 25 points</li>
                <li>• <strong>Watch Active:</strong> 15-20 points</li>
                <li>• <strong>M7.0+ ocean event:</strong> 15-20 points</li>
                <li>• <strong>Shallow depth (&lt;70km):</strong> +5 points</li>
                <li>• <strong>Tidal amplification:</strong> +3-7 points</li>
                <li>• <strong>Landlocked:</strong> 0 points</li>
              </ul>
              <p className="text-slate-400 text-[10px] italic pt-1 border-t border-slate-700">
                Combines official warnings with environmental conditions
              </p>
            </div>
          }
        />

        <ScoreMeter 
          value={score.factors.historicalImpact} 
          max={5} 
          label="Historical Factor" 
          details={['Based on similar past events in region']}
          helpContent={
            <div className="space-y-2">
              <p className="font-semibold">How This Is Calculated</p>
              <p>Penalty/bonus based on regional seismic history:</p>
              <ul className="ml-3 space-y-1 text-slate-300">
                <li>• <strong>High-risk region</strong> (Ring of Fire): +5 points</li>
                <li>• <strong>Moderate-risk region:</strong> +3 points</li>
                <li>• <strong>Low-risk region:</strong> +1 point</li>
                <li>• <strong>Past maritime impacts:</strong> priority boost</li>
              </ul>
              <p className="text-slate-400 text-[10px] italic pt-1 border-t border-slate-700">
                Regions with frequent M7+ events get higher priority
              </p>
            </div>
          }
        />
      </div>

      <div className="pt-3 border-t border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">
            {score.shouldAutoFetch ? '✓ Auto-analysis enabled' : 'Manual analysis available'}
          </span>
          {score.refreshInterval && (
            <span className="text-slate-500">
              Refresh: {score.refreshInterval / 1000}s
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <Info className="h-3 w-3" />
          <span>Hover over info icons for detailed scoring methodology</span>
        </div>
      </div>
    </div>
  )
}
