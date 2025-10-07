import { LucideIcon } from 'lucide-react'

type IconColor = 'red' | 'blue' | 'cyan' | 'purple' | 'green' | 'orange' | 'slate' | 'yellow' | 'emerald'

type WidgetCardProps = {
  title: string
  icon: LucideIcon
  iconColor?: IconColor
  children: React.ReactNode
  headerAction?: React.ReactNode
  subtitle?: string
  className?: string
  noPadding?: boolean
  style?: React.CSSProperties
}

const colorMap: Record<IconColor, { bg: string; text: string }> = {
  red: { bg: 'bg-red-50', text: 'text-red-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  green: { bg: 'bg-green-50', text: 'text-green-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-600' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
}

export default function WidgetCard({
  title,
  icon: Icon,
  iconColor = 'blue',
  children,
  headerAction,
  subtitle,
  className = '',
  noPadding = false,
  style
}: WidgetCardProps) {
  const colors = colorMap[iconColor]

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200/60 ${noPadding ? '' : 'p-6'} ${className} flex flex-col`} style={style}>
      {/* Header */}
      <div className={`flex items-center justify-between ${noPadding ? 'px-6 pt-6 pb-4' : 'mb-6'}`}>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${colors.bg} rounded-lg`}>
              <Icon className={`h-5 w-5 ${colors.text}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
        {headerAction && (
          <div className="ml-4">
            {headerAction}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={noPadding ? 'px-6 pb-6 flex-1 min-h-0 flex flex-col' : ''}>
        {children}
      </div>
    </div>
  )
}
