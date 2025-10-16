import { aggregateServicesTimeline, TimelinePoint } from '@/lib/status/aggregate'

describe('aggregateServicesTimeline', () => {
  it('computes average fraction healthy across services per timestamp', () => {
    const t0 = Date.now()
    const t1 = t0 + 60_000

    const services: Record<string, TimelinePoint[]> = {
      database: [
        { time: t0, worstStatus: 'healthy', count: 1 },
        { time: t1, worstStatus: 'healthy', count: 1 },
      ],
      redis: [
        { time: t0, worstStatus: 'healthy', count: 1 },
        { time: t1, worstStatus: 'warning', count: 1 },
      ],
      usgs: [
        { time: t0, worstStatus: 'warning', count: 1 },
        { time: t1, worstStatus: 'healthy', count: 1 },
      ],
    }

    const { aggregatedPoints, healthyPercent, totalServices } = aggregateServicesTimeline(services)

    expect(totalServices).toBe(3)
    expect(aggregatedPoints).toHaveLength(2)

    // t0: healthy/healthy/warning => 2/3 healthy
    // t1: healthy/warning/healthy => 2/3 healthy
    // avg healthy fraction = (2/3 + 2/3) / 2 = 2/3 => 66.67%
    expect(healthyPercent).toBe('66.67')
  })

  it('handles empty services gracefully', () => {
    const result = aggregateServicesTimeline({})
    expect(result.totalServices).toBe(0)
    expect(result.aggregatedPoints).toHaveLength(0)
    expect(result.healthyPercent).toBe('0.00')
  })
})
