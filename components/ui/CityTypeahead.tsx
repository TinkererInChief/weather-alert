'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { MapPin, X } from 'lucide-react'
import ct from 'city-timezones'

type City = {
  name: string
  country: string
  latitude: number
  longitude: number
  displayName: string
}

type CityTypeaheadProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  error?: string
}

export default function CityTypeahead({ 
  value, 
  onChange, 
  placeholder = 'Type city name...', 
  className = '',
  error 
}: CityTypeaheadProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredCities, setFilteredCities] = useState<City[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get all cities from the database (memoized for performance)
  const allCities = useMemo(() => {
    const cities = ct.cityMapping
    // Filter to only major cities (population > 500k) for better performance
    return cities
      .filter((c: any) => c.pop > 500000)
      .map((c: any) => ({
        name: c.city,
        country: c.country,
        latitude: parseFloat(c.lat),
        longitude: parseFloat(c.lng),
        displayName: `${c.city}, ${c.country}`
      }))
      .sort((a: City, b: City) => a.name.localeCompare(b.name))
  }, [])

  useEffect(() => {
    if (value.length >= 2) {
      const searchLower = value.toLowerCase()
      const filtered = allCities
        .filter((city: City) =>
          city.displayName.toLowerCase().includes(searchLower) ||
          city.name.toLowerCase().includes(searchLower) ||
          city.country.toLowerCase().includes(searchLower)
        )
        .slice(0, 10) // Show top 10 results
      setFilteredCities(filtered)
      setIsOpen(filtered.length > 0)
    } else {
      setFilteredCities([])
      setIsOpen(false)
    }
  }, [value, allCities])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => Math.min(prev + 1, filteredCities.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCities[highlightedIndex]) {
          selectCity(filteredCities[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const selectCity = (city: City) => {
    onChange(city.displayName)
    setIsOpen(false)
    setHighlightedIndex(0)
  }

  const clearValue = () => {
    onChange('')
    inputRef.current?.focus()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (filteredCities.length > 0) setIsOpen(true)
          }}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-slate-300'
          } ${className}`}
        />
        {value && (
          <button
            type="button"
            onClick={clearValue}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && filteredCities.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-64 overflow-y-auto"
        >
          {filteredCities.map((city, index) => (
            <button
              key={`${city.name}-${city.country}`}
              type="button"
              onClick={() => selectCity(city)}
              className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 transition-colors ${
                index === highlightedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">
                  {city.name}
                </div>
                <div className="text-sm text-slate-500 truncate">
                  {city.country}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Hint */}
      {!value && !isOpen && (
        <p className="mt-1 text-xs text-slate-500">
          Start typing to search cities...
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
