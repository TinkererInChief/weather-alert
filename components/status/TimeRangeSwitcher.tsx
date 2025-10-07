"use client"

import { memo } from 'react'
import clsx from 'clsx'

type TimeRangeKey = '24h' | '7d' | '30d'

type Props = {
  value: TimeRangeKey
  onChange: (value: TimeRangeKey) => void
}

const ranges: Array<{ key: TimeRangeKey; label: string }> = [
  { key: '24h', label: 'Last 24h' },
  { key: '7d', label: 'Last 7d' },
  { key: '30d', label: 'Last 30d' },
]

function TimeRangeSwitcher({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {ranges.map(r => (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          className={clsx(
            'px-3 py-1 text-sm rounded-md transition-colors',
            value === r.key ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

export default memo(TimeRangeSwitcher)
