import { ReactNode } from 'react'

type PublicPageContentProps = {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl'
  className?: string
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md', 
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl'
}

export default function PublicPageContent({ 
  children, 
  maxWidth = '6xl',
  className = ''
}: PublicPageContentProps) {
  return (
    <main className={`${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-16 ${className}`}>
      {children}
    </main>
  )
}

// Content section components for consistent styling
export function ContentSection({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string 
}) {
  return (
    <section className={`mb-20 ${className}`}>
      {children}
    </section>
  )
}

export function SectionTitle({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string 
}) {
  return (
    <h2 className={`text-3xl font-bold text-slate-900 mb-12 text-center tracking-tight ${className}`}>
      {children}
    </h2>
  )
}

export function Card({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string 
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 ${className}`}>
      {children}
    </div>
  )
}

export function GradientCard({ 
  children, 
  variant = 'blue',
  className = '' 
}: { 
  children: ReactNode; 
  variant?: 'blue' | 'red' | 'green' | 'purple' | 'slate';
  className?: string 
}) {
  const variants = {
    blue: 'from-blue-50/80 to-indigo-50/80 border-blue-100/50',
    red: 'from-red-50/80 to-orange-50/80 border-red-100/50',
    green: 'from-green-50/80 to-emerald-50/80 border-green-100/50',
    purple: 'from-purple-50/80 to-violet-50/80 border-purple-100/50',
    slate: 'from-slate-50/80 to-gray-50/80 border-slate-100/50'
  }
  
  return (
    <div className={`bg-gradient-to-br ${variants[variant]} rounded-2xl border backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      {children}
    </div>
  )
}
