/**
 * Multi-source earthquake and tsunami data integration
 * 
 * This module provides a unified interface for fetching earthquake and tsunami
 * data from multiple authoritative sources with automatic deduplication and
 * cross-validation.
 * 
 * Supported Sources:
 * - USGS: Global coverage, best for Americas
 * - EMSC: Europe, Mediterranean, Middle East, North Africa
 * - JMA: Japan, Western Pacific (critical for tsunami detection)
 * - PTWC: Pacific Tsunami Warning Center
 * 
 * Features:
 * - Automatic deduplication (events within 50km, 5min, 0.3 magnitude)
 * - Source health monitoring
 * - Fallback handling
 * - Cross-validation for higher confidence
 */

export type { DataSource, FetchOptions, TsunamiAlert, SourceHealthStatus } from './base-source'
export { BaseDataSource } from './base-source'
export { USGSSource } from './usgs-source'
export { EMSCSource } from './emsc-source'
export { JMASource } from './jma-source'
export { PTWCSource } from './ptwc-source'
export type { AggregatedEarthquake } from './aggregator'
export { DataAggregator, dataAggregator } from './aggregator'
