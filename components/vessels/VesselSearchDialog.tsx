'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Ship, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { debounce } from '@/lib/utils'

type GlobalVessel = {
  id: string
  imo: string
  mmsi?: string
  name: string
  vesselType: string
  flag?: string
  length?: number
  grossTonnage?: number
  buildYear?: number
  owner?: string
  operator?: string
  dataQuality: number
  trackedVessel?: {
    id: string
    lastSeen: string
    active: boolean
  }
}

type VesselSearchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (vessel: GlobalVessel) => void
  selectedVesselIds?: string[]
}

export function VesselSearchDialog({
  open,
  onOpenChange,
  onSelect,
  selectedVesselIds = []
}: VesselSearchDialogProps) {
  const [query, setQuery] = useState('')
  const [vessels, setVessels] = useState<GlobalVessel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery || searchQuery.length < 2) {
        setVessels([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/vessels/search?q=${encodeURIComponent(searchQuery)}&limit=50`
        )
        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Search failed')
        }

        setVessels(data.vessels)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setVessels([])
      } finally {
        setLoading(false)
      }
    }, 300),
    []
  )

  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  const handleSelect = (vessel: GlobalVessel) => {
    onSelect(vessel)
    setQuery('')
    setVessels([])
  }

  const isSelected = (vesselId: string) => selectedVesselIds.includes(vesselId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Search Global Vessels</DialogTitle>
          <DialogDescription>
            Search by IMO number, MMSI, or vessel name. Database contains {vessels.length > 0 ? '100,000+' : 'thousands of'} vessels worldwide.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search IMO, MMSI, or vessel name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && query.length < 2 && (
            <div className="text-center py-12 text-slate-400">
              <Ship className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Enter at least 2 characters to search</p>
            </div>
          )}

          {/* No Results */}
          {!loading && !error && query.length >= 2 && vessels.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No vessels found matching "{query}"</p>
              <p className="text-xs mt-2">Try searching by IMO number or full vessel name</p>
            </div>
          )}

          {/* Results List */}
          {vessels.length > 0 && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {vessels.map((vessel) => (
                  <VesselCard
                    key={vessel.id}
                    vessel={vessel}
                    selected={isSelected(vessel.id)}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function VesselCard({
  vessel,
  selected,
  onSelect
}: {
  vessel: GlobalVessel
  selected: boolean
  onSelect: (vessel: GlobalVessel) => void
}) {
  return (
    <div
      onClick={() => !selected && onSelect(vessel)}
      className={`
        p-4 border rounded-lg transition-all cursor-pointer
        ${selected 
          ? 'bg-green-500/10 border-green-500/30 cursor-not-allowed' 
          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Vessel Name */}
          <div className="flex items-center gap-2 mb-2">
            <Ship className="h-4 w-4 text-blue-400 flex-shrink-0" />
            <h3 className="font-semibold text-white truncate">{vessel.name}</h3>
            {selected && (
              <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
            )}
          </div>

          {/* Vessel Details */}
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="font-mono">IMO: {vessel.imo}</span>
              {vessel.mmsi && (
                <>
                  <span>•</span>
                  <span className="font-mono">MMSI: {vessel.mmsi}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {vessel.vesselType}
              </Badge>
              
              {vessel.flag && (
                <Badge variant="outline" className="text-xs">
                  🏳️ {vessel.flag}
                </Badge>
              )}
              
              {vessel.length && (
                <span className="text-xs text-slate-400">
                  {vessel.length}m
                </span>
              )}
              
              {vessel.grossTonnage && (
                <span className="text-xs text-slate-400">
                  {vessel.grossTonnage.toLocaleString()} GT
                </span>
              )}
              
              {vessel.buildYear && (
                <span className="text-xs text-slate-400">
                  Built: {vessel.buildYear}
                </span>
              )}
            </div>

            {(vessel.owner || vessel.operator) && (
              <div className="text-xs text-slate-500">
                {vessel.owner && <span>Owner: {vessel.owner}</span>}
                {vessel.owner && vessel.operator && <span> • </span>}
                {vessel.operator && <span>Operator: {vessel.operator}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {vessel.trackedVessel?.active && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse" />
              Live
            </Badge>
          )}
          
          <div className="text-xs text-slate-400">
            Quality: {vessel.dataQuality}%
          </div>
        </div>
      </div>

      {selected && (
        <div className="mt-3 pt-3 border-t border-green-500/20">
          <p className="text-xs text-green-400">
            ✓ Already added to fleet
          </p>
        </div>
      )}
    </div>
  )
}
