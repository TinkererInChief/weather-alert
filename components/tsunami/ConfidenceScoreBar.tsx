type ConfidenceScoreBarProps = {
  score: number // 0-100
  sources: string[]
  showDetails?: boolean
}

export function ConfidenceScoreBar({ score, sources, showDetails = true }: ConfidenceScoreBarProps) {
  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'bg-green-600'
    if (score >= 75) return 'bg-blue-600'
    if (score >= 60) return 'bg-yellow-600'
    if (score >= 40) return 'bg-orange-600'
    return 'bg-red-600'
  }
  
  const getConfidenceLabel = (score: number) => {
    if (score >= 90) return 'Very High'
    if (score >= 75) return 'High'
    if (score >= 60) return 'Moderate'
    if (score >= 40) return 'Low'
    return 'Very Low'
  }
  
  const colorClass = getConfidenceColor(score)
  const label = getConfidenceLabel(score)
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Alert Confidence</span>
          <span className="text-xs text-gray-500">({label})</span>
        </div>
        <span className="text-sm font-bold text-gray-900">{score}%</span>
      </div>
      
      <div className="relative w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${score}%` }}
        />
      </div>
      
      {showDetails && sources.length > 0 && (
        <p className="text-xs text-gray-600">
          Based on {sources.length} source{sources.length > 1 ? 's' : ''}: {' '}
          <span className="font-medium">{sources.join(', ')}</span>
        </p>
      )}
    </div>
  )
}
