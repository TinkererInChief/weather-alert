import { Scenario } from './types'

export const SCENARIOS: Scenario[] = [
  {
    id: 'tohoku',
    name: 'Tohoku 9.0',
    emoji: '🇯🇵',
    epicenter: {
      lat: 38.3,
      lon: 142.4
    },
    magnitude: 9.0,
    region: 'Japan',
    description: '2011 Tohoku-like event - Most devastating tsunami in recent history',
    // Real 2011 event parameters
    depth: 29, // km - shallow megathrust
    faultType: 'thrust', // Subduction zone
    faultStrike: 193, // N-S trending Japan Trench
    faultLength: 500, // Massive rupture ~500km
    faultWidth: 200 // ~200km wide rupture zone
  },
  {
    id: 'tohoku-max',
    name: 'Tohoku 9.5',
    emoji: '🌴',
    epicenter: {
      lat: 38.3,
      lon: 142.4
    },
    magnitude: 9.5,
    region: 'Japan',
    description: 'Maximum credible event for Tohoku region',
    depth: 25, // Shallower = more tsunamigenic
    faultType: 'thrust',
    faultStrike: 193,
    faultLength: 800, // Extreme scenario
    faultWidth: 250
  },
  {
    id: 'indonesia',
    name: 'Indonesia',
    emoji: '🏝️',
    epicenter: {
      lat: -8.5,
      lon: 119.5
    },
    magnitude: 7.0,
    region: 'Indonesia',
    description: 'Flores Sea tsunami scenario',
    depth: 35, // Moderate depth
    faultType: 'thrust', // Sunda Arc subduction
    faultStrike: 60, // E-W trending
    faultLength: 80,
    faultWidth: 40
  },
  {
    id: 'california',
    name: 'California',
    emoji: '🌊',
    epicenter: {
      lat: 36.0,
      lon: -122.0
    },
    magnitude: 6.5,
    region: 'USA',
    description: 'Monterey Bay local tsunami event',
    depth: 15, // Shallow coastal event
    faultType: 'strike-slip', // San Andreas type - minimal tsunami
    faultStrike: 315, // NW-SE trending
    faultLength: 30,
    faultWidth: 15
  }
]
