"use client"

import { motion } from 'framer-motion'
import { 
  Search, 
  AlertTriangle, 
  Ship, 
  Users, 
  Radio, 
  FileText, 
  Send, 
  Phone, 
  Mail, 
  MessageCircle, 
  CheckCircle, 
  CheckCheck,
  Bell
} from 'lucide-react'

type TimelineStep = {
  id: string
  time: string
  title: string
  description: string
  icon: React.ElementType
  color: string
}

const timelineSteps: TimelineStep[] = [
  {
    id: 't0',
    time: 'T0',
    title: 'M7.2 EARTHQUAKE DETECTED',
    description: 'Multi-source monitoring',
    icon: Search,
    color: 'from-red-500 to-red-600'
  },
  {
    id: 't1',
    time: 'T1',
    title: 'TSUNAMI THREAT ASSESSED',
    description: 'WARNING (70% conf.)',
    icon: AlertTriangle,
    color: 'from-orange-500 to-orange-600'
  },
  {
    id: 't2',
    time: 'T2',
    title: 'VESSEL PROXIMITY CALCULATED',
    description: '45 vessels in zone',
    icon: Ship,
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 't3',
    time: 'T3',
    title: 'CONTACTS QUERIED',
    description: '190 active',
    icon: Users,
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 't4',
    time: 'T4',
    title: 'CHANNELS SELECTED',
    description: 'Severity 5: all channels',
    icon: Radio,
    color: 'from-indigo-500 to-indigo-600'
  },
  {
    id: 't5',
    time: 'T5',
    title: 'MESSAGES RENDERED',
    description: '600 generated',
    icon: FileText,
    color: 'from-cyan-500 to-cyan-600'
  },
  {
    id: 't6',
    time: 'T6',
    title: 'MESSAGES ENQUEUED',
    description: 'Queued',
    icon: Send,
    color: 'from-teal-500 to-teal-600'
  },
  {
    id: 't7',
    time: 'T7',
    title: 'SMS DELIVERED',
    description: 'Notification',
    icon: Phone,
    color: 'from-green-500 to-green-600'
  },
  {
    id: 't8',
    time: 'T8',
    title: 'EMAILS DELIVERED',
    description: 'Notification',
    icon: Mail,
    color: 'from-emerald-500 to-emerald-600'
  },
  {
    id: 't9',
    time: 'T9',
    title: 'WHATSAPP DELIVERED',
    description: 'Notification',
    icon: MessageCircle,
    color: 'from-lime-500 to-lime-600'
  },
  {
    id: 't10',
    time: 'T10',
    title: 'ALL NOTIFICATIONS DELIVERED',
    description: 'Logs updated & verified',
    icon: CheckCircle,
    color: 'from-green-600 to-green-700'
  },
  {
    id: 't11',
    time: 'T11',
    title: 'ACKNOWLEDGMENT VERIFIED',
    description: 'Tracked',
    icon: CheckCheck,
    color: 'from-blue-600 to-blue-700'
  },
  {
    id: 't12',
    time: 'T12',
    title: 'ESCALATION INITIATED',
    description: 'Auto-escalation if no acknowledgment',
    icon: Bell,
    color: 'from-red-600 to-red-700'
  }
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { 
    opacity: 0, 
    x: -20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    x: 0,
    scale: 1
  }
}

const lineVariants = {
  hidden: { 
    height: 0,
    opacity: 0
  },
  visible: { 
    height: "100%",
    opacity: 1
  }
}

type TimelineAnimationProps = {
  autoPlay?: boolean
}

export default function TimelineAnimation({ autoPlay = true }: TimelineAnimationProps) {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3, margin: "200px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            FROM DETECTION TO ACTION
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Watch how our AI-powered system processes threats and delivers 
            alerts in under 30 seconds
          </p>
          <div className="mt-6 inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-300 text-sm font-medium">Live Processing</span>
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div
          variants={containerVariants}
          initial={autoPlay ? "hidden" : "visible"}
          whileInView="visible"
          viewport={{ once: true, amount: 0.1, margin: "100px" }}
          className="relative"
          style={{ willChange: 'opacity, transform' }}
        >
          {timelineSteps.map((step, index) => (
            <motion.div
              key={step.id}
              variants={itemVariants}
              transition={{ duration: 0.5 }}
              className="relative flex gap-6 pb-8 last:pb-0"
            >
              {/* Timeline Line */}
              {index < timelineSteps.length - 1 && (
                <div className="absolute left-[28px] top-[56px] w-0.5 h-full">
                  <motion.div 
                    variants={lineVariants}
                    transition={{ duration: 0.4 }}
                    className="w-full bg-gradient-to-b from-slate-600 to-slate-700"
                  />
                </div>
              )}

              {/* Icon Container */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="relative z-10 flex-shrink-0"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <step.icon className="h-7 w-7 text-white" />
                </div>
              </motion.div>

              {/* Content Card */}
              <motion.div
                whileHover={{ scale: 1.02, x: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="flex-1 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/70 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="inline-flex items-center space-x-2 mb-1">
                      <span className="text-xs font-mono text-slate-400 bg-slate-900/50 px-2 py-1 rounded">
                        {step.time}
                      </span>
                      {index < 4 && (
                        <span className="text-xs text-emerald-400 font-medium">
                          &lt; {(index + 1) * 2}s
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white tracking-tight">
                      {step.title}
                    </h3>
                  </div>
                </div>
                <p className="text-slate-400 text-sm">
                  {step.description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3, margin: "150px" }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 grid md:grid-cols-3 gap-6"
        >
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 text-center">
            <div className="text-3xl font-bold text-white mb-2">
              &lt; 30s
            </div>
            <div className="text-slate-400">
              Detection to Delivery
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 text-center">
            <div className="text-3xl font-bold text-white mb-2">
              13 Steps
            </div>
            <div className="text-slate-400">
              Automated Processing
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 text-center">
            <div className="text-3xl font-bold text-white mb-2">
              99.9%
            </div>
            <div className="text-slate-400">
              Delivery Success Rate
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
