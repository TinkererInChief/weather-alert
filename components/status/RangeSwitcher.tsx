"use client"

import { memo } from 'react'
import clsx from 'clsx'

type RangeKey = '60m' | '24h' | '7d'

type Props = {
  value: RangeKey
  onChange: (value: RangeKey) => void
}

const ranges: Array<{ key: RangeKey; label: string }> = [
  { key: '60m', label: 'Last 60m' },
  { key: '24h', label: 'Last 24h' },
  { key: '7d', label: 'Last 7d' },
]

function RangeSwitcher({ value, onChange }: Props) {
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

export default memo(RangeSwitcher)
