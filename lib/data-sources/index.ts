/**
 * Multi-source earthquake and tsunami data integration
 * 
 * This module provides a unified interface for fetching earthquake and tsunami
 * Data Sources
 * 
 * Multi-source earthquake and tsunami data aggregation with automatic failover.
 * 
 * Earthquake Sources:
 * - USGS: Global coverage, best for Americas
 * - EMSC: Europe, Mediterranean, Middle East, North Africa
 * - JMA: Japan, Western Pacific (critical for tsunami detection)
 * - IRIS: Research-grade global seismic data
 * - GeoNet: New Zealand and Southwest Pacific
 * 
 * Tsunami Sources:
 * - PTWC: Pacific Tsunami Warning Center (NOAA)
 * - JMA: Japan tsunami warnings and advisories
 * - DART: Deep-ocean tsunami buoy network (NOAA)
 * - GeoNet: New Zealand tsunami alerts
 * 
 * Features:
 * - Automatic deduplication (events within 50km, 5min, 0.3 magnitude)
 * - Cross-source validation
 * - Health monitoring
 * - Intelligent source prioritization
 * 
 * Attribution Requirements:
 * - USGS, PTWC, DART: Public domain, attribution optional
 * - JMA: "Source: Japan Meteorological Agency (https://www.jma.go.jp)"
 * - GeoNet: "Data from GeoNet, GNS Science, New Zealand"
 * - EMSC: "Credit: EMSC/CSEM, https://www.emsc-csem.org"
 */

export { BaseDataSource } from './base-source'
export type { DataSource, FetchOptions, TsunamiAlert } from './base-source'
export { USGSSource } from './usgs-source'
export { EMSCSource } from './emsc-source'
export { JMASource } from './jma-source'
export { PTWCSource } from './ptwc-source'
export { IRISSource } from './iris-source'
export { DARTBuoySource } from './dart-buoy-source'
export { GeoNetSource } from './geonet-source'
export type { AggregatedEarthquake } from './aggregator'
export { DataAggregator, dataAggregator } from './aggregator'
