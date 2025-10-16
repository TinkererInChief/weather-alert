export type Status = 'healthy' | 'warning' | 'critical'

export type TimelinePoint = {
  time: number
  worstStatus: Status
  count: number
}

export type AggregatedPoint = {
  time: number
  worstStatus: Status
  count: number
  healthyFraction: number
}

const aggregateStatus = (statuses: Status[]): Status => {
  if (statuses.includes('critical')) return 'critical'
  if (statuses.includes('warning')) return 'warning'
  return 'healthy'
}

export function aggregateServicesTimeline(servicesData: Record<string, TimelinePoint[]>) {
  const validServices = Object.entries(servicesData).filter(([, points]) => Array.isArray(points) && points.length > 0)

  if (validServices.length === 0) {
    return {
      aggregatedPoints: [] as AggregatedPoint[],
      healthyPercent: '0.00',
      totalServices: 0,
    }
  }

  const allTimestamps = new Set<number>()
  validServices.forEach(([, points]) => {
    points.forEach((p) => allTimestamps.add(p.time))
  })

  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

  const aggregated: AggregatedPoint[] = sortedTimestamps.map((time) => {
    const statusesAtTime: Status[] = []

    validServices.forEach(([, points]) => {
      const point = points.find((p) => p.time === time)
      if (point) {
        statusesAtTime.push(point.worstStatus)
      }
    })

    return {
      time,
      worstStatus: aggregateStatus(statusesAtTime),
      count: 1,
      healthyFraction:
        statusesAtTime.length > 0
          ? statusesAtTime.filter((s) => s === 'healthy').length / statusesAtTime.length
          : 0,
    }
  })

  const avgHealthyFraction =
    aggregated.length > 0 ? aggregated.reduce((sum, p) => sum + (p.healthyFraction || 0), 0) / aggregated.length : 0

  const healthyPct = (avgHealthyFraction * 100).toFixed(2)

  return {
    aggregatedPoints: aggregated,
    healthyPercent: healthyPct,
    totalServices: validServices.length,
  }
}
