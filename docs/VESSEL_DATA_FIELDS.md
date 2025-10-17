# Vessel Data Fields - Population Status

## Overview
This document tracks which fields in the `Vessel` schema are populated by our data ingestion services (AISStream and OpenShipData).

## Field Status

### ✅ Fully Populated Fields

| Field | Source | Notes |
|-------|--------|-------|
| `mmsi` | AIS/OpenShipData | Required - Maritime Mobile Service Identity |
| `name` | AIS ShipStaticData / OpenShipData | Vessel name |
| `callsign` | AIS ShipStaticData / OpenShipData | Radio callsign |
| `imo` | AIS ShipStaticData | International Maritime Organization number |
| `vesselType` | AIS ShipStaticData / OpenShipData | Mapped from AIS type codes (30-89) |
| `flag` | **Derived from MMSI** | ISO country code from MMSI's first 3 digits (MID) |
| `length` | AIS ShipStaticData / OpenShipData | Total length in meters (A+B dimensions) |
| `width` | AIS ShipStaticData / OpenShipData | Total width in meters (C+D dimensions) |
| `draught` | AIS ShipStaticData | Maximum static draught in meters |
| `active` | Auto-set | Default true on creation |
| `lastSeen` | AIS PositionReport / OpenShipData | Timestamp of last received message |

### ❌ Unpopulated Fields (Not Available in AIS)

| Field | Reason | Potential Solution |
|-------|--------|-------------------|
| `grossTonnage` | Not transmitted in standard AIS messages | Would require external vessel database API |
| `operator` | Not transmitted in standard AIS messages | Would require external vessel database API |
| `owner` | Not transmitted in standard AIS messages | Would require external vessel database API |

## Vessel Type Mapping

### AIS Type Codes
The AIS standard defines vessel types using numeric codes. We map these to our simplified categories:

- **30**: Fishing
- **31-32, 52**: Tug/Towing
- **33**: Dredging
- **34**: Diving
- **35**: Military
- **36**: Sailing
- **37**: Pleasure craft
- **40-49**: High speed craft
- **50**: Pilot vessel
- **51**: Search and rescue
- **53-54**: Port tender
- **55**: Law enforcement
- **60-69**: Passenger vessels
- **70-79**: Cargo vessels
- **80-89**: Tanker vessels

### OpenShipData Type Mapping
OpenShipData uses string-based vessel types which we normalize:
- `YACHT`, `SAILBOAT`, `SAILING` → `sailing`
- `MOTOR_YACHT`, `PLEASURE`, `CONSOLE_BOAT` → `pleasure`
- `FISHING` → `fishing`
- `CARGO`, `CONTAINER` → `cargo`
- `TANKER` → `tanker`
- `PASSENGER` → `passenger`
- `TUG` → `tug`
- `PILOT` → `pilot`
- `DREDGER` → `dredging`
- `MILITARY` → `military`
- `HIGH_SPEED` → `high_speed`

## Flag Derivation from MMSI

The first 3 digits of an MMSI number represent the Maritime Identification Digits (MID), which identify the vessel's flag state.

### Examples:
- `366123456` → `366` → United States (`US`)
- `232001234` → `232` → United Kingdom (`GB`)
- `431012345` → `431` → Japan (`JP`)
- `563123456` → `563` → Singapore (`SG`)

We maintain a complete mapping of all 400+ MID codes to ISO country codes in `/lib/utils/mmsi-to-country.ts`.

## Data Source Priority

When vessel data is received from multiple sources:

1. **AIS ShipStaticData** is authoritative for vessel specifications (type, dimensions, draught)
2. **Flag** is always derived from MMSI (consistent across all sources)
3. **Position data** is accepted from both AISStream and OpenShipData
4. **Last update wins** - newer data overwrites older data via upsert operations

## Improvements Made (2025-10-17)

### Before
- ❌ Flag: Always `null`
- ❌ Draught: Always `null`
- ❌ VesselType: Often stuck as `'other'` (incomplete mapping)
- ❌ IMO: Type mismatch (integer vs string)

### After
- ✅ Flag: Derived from MMSI for all vessels
- ✅ Draught: Populated from `MaximumStaticDraught` when available
- ✅ VesselType: Complete mapping for all AIS codes 30-89
- ✅ IMO: Properly converted to string

## External Data Enhancement (Future)

To populate `grossTonnage`, `operator`, and `owner`, we would need to integrate with:

- **IHS Markit Sea-web**: Commercial vessel database
- **Lloyd's List Intelligence**: Vessel ownership and operator data
- **Equasis**: Free public database (limited data)
- **IMO GISIS**: Ship particulars database

These services typically charge fees and have API rate limits.
