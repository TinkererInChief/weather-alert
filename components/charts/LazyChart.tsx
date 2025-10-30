'use client'

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

// Skeleton for charts while loading
const ChartSkeleton = ({ height = 300 }: { height?: number }) => (
  <div 
    className="w-full animate-pulse bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 rounded-lg"
    style={{ height: `${height}px` }}
  >
    <div className="flex items-center justify-center h-full">
      <div className="text-slate-400 text-sm">Loading chart...</div>
    </div>
  </div>
)

// Lazy load Recharts components with proper typing
export const LazyAreaChart = dynamic(
  () => import('recharts').then((mod) => mod.AreaChart as any),
  { 
    ssr: false,
    loading: () => <ChartSkeleton />
  }
)

export const LazyBarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart as any),
  { 
    ssr: false,
    loading: () => <ChartSkeleton />
  }
)

export const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart as any),
  { 
    ssr: false,
    loading: () => <ChartSkeleton />
  }
)

export const LazyPieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart as any),
  { 
    ssr: false,
    loading: () => <ChartSkeleton height={250} />
  }
)

export const LazyComposedChart = dynamic(
  () => import('recharts').then((mod) => mod.ComposedChart as any),
  { 
    ssr: false,
    loading: () => <ChartSkeleton />
  }
)

// Export other Recharts components that don't need lazy loading
export { 
  ResponsiveContainer,
  Area,
  Bar,
  Line,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts'
