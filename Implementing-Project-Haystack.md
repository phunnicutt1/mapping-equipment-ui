# Implementing Project Haystack

## Applying Haystack Tagging for a Sample Building

---

## Table of Contents

1.  [Introduction](#introduction)
2.  [Core Data Model Concepts](#core-data-model-concepts)
3.  [Defining a Sample Project – A Building in Gaithersburg MD, USA](#defining-a-sample-project)
4.  [Inspecting the Model & Exchanging Data](#inspecting-the-model)
5.  [Further Information](#further-information)
6.  [Reference Models](#reference-models)

---

## Introduction

### Document Goals

This document introduces core Haystack data-model concepts and solidifies understanding by walking through a simple, real-world example.

### Project Haystack Data Model

Project Haystack provides a semantic data model for representing equipment and relationships in automation, control, energy, HVAC, lighting, and other environmental systems. A standardized structure makes it easy to exchange information and unlock value from the vast data generated by smart devices.

### Background Reading

Readers should already be familiar with Project-Haystack.org and the basics of semantic tagging.  
_Recommended primer:_ [**Introduction to Project Haystack**](https://project-haystack.org/doc/getting-started/intro)

---

## Core Data Model Concepts

### Entities and Tags

*   **Entities** map physical objects to abstract records—sites, equipment, or points.
*   **Tags** are facts about an entity. For example, applying `site` to an entity declares that the entity represents a building with an address.

Haystack defines **200+ tags** that can be combined to describe virtually any equipment, system, or relationship. The three foundational markers are:

| Marker | Meaning |
| --- | --- |
| `site` | A building / physical site |
| `equip` | A piece of equipment |
| `point` | A sensor or control point |

### Tag Kinds

Haystack tags have several **kinds** (types). The most common are:

| Kind | Description | Example |
| --- | --- | --- |
| **Marker** | Annotation with no value  (`is-a` relationship) | `ahu` (entity _is_ an air-handler) |
| **Str** | String value | `dis: "Incoming Energy Meter"` |
| **Ref** | Reference to another entity | `equipRef: @id_of_equip` |

Other kinds include `Number`, `Bool`, `DateTime`, `Coord`, `Uri`, and the collection kinds `List`, `Dict`, `Grid`.

#### Example: Energy-Meter kWh Point

```
point       ✓
elec        ✓
energy      ✓
dis         "Energy"
kind        "Number"
unit        "kWh"
equipRef    @Id_of_Energy_Meter
```

---

## Defining a Sample Project

### Project Details

**Building:** 18212 Montgomery Village Ave, Gaithersburg MD (Zone: New York)  
Size: 8 013 ft² • Built 2001 • Retail store

**Systems**

Rooftop HVAC Units: **RTU-1**, **RTU-2**

Electric Meters: main, HVAC, lighting, plug-load

Gas meter

Lighting circuits: main lights, parking lights

### Step 1 – Site Entity

| Tag | Value | Kind | Notes |
| --- | --- | --- | --- |
| `id` | `@2180b666-430b2363` | Ref | Unique DB ID |
| `site` | ✓ | Marker | Declares entity is a site |
| `dis` | `Gaithersburg` | Str | Display name |
| `geoAddr` | `18212 Montgomery Village Ave, Gaithersburg MD` | Str | Address |
| `geoCity` | `Gaithersburg` | Str |   |
| `geoCoord` | `C(39.154824,-77.209002)` | Coord |   |
| `geoCountry` | `US` | Str |   |
| `geoPostalCode` | `20879` | Str |   |
| `geoState` | `MD` | Str |   |
| `tz` | `New_York` | Str | Time-zone |

### Step 2 – Equipment Entity (RTU-1)

| Tag | Value | Kind |
| --- | --- | --- |
| `id` | `@2180b666-7032054c` | Ref |
| `equip` | ✓ | Marker |
| `dis` | `RTU-1` | Str |
| `ahu`, `hvac`, `rooftop` | ✓ | Marker (3×) |
| `siteRef` | `@2180b666-430b2363` | Ref (links to Site) |
| `elecMeterRef` | `@2180b666-7032054d` | Ref (links to HVAC meter) |

### Step 3 – Point Entity (Discharge-Air Temperature)

| Tag | Value | Kind |
| --- | --- | --- |
| `id` | `@218a0616-0b5e382b` | Ref |
| `point` | ✓ | Marker |
| `dis` | `Discharge Air Temp` | Str |
| `discharge`, `air`, `temp`, `sensor`, `his` | ✓ | Marker (5×) |
| `kind` | `Number` | Str |
| `unit` | `°F` | Str |
| `siteRef` | `@2180b666-430b2363` | Ref |
| `equipRef` | `@2180b666-7032054c` | Ref |

### Visual Relationship

```
[Site: Gaithersburg]
       └── [Equip: RTU-1]
               └── [Point: Discharge-Air-Temp]
```

_Additional points (cooling stages, pressures, damper, zone temp, etc.) would be tagged similarly._

---

## Inspecting the Model

### Viewing Entities

Haystack records can be presented as pop-ups, CSV, Excel, grids, etc.  
Example CSV for the `site` record 👇

```
id,area,dis,geoAddr,geoCity,geoCoord,geoCountry,geoPostalCode,primaryFunction,site,tz,yearBuilt
@2180b666-430b2363,8013ft²,Gaithersburg,"18212 Montgomery Village Ave, Gaithersburg MD",Gaithersburg,C(39.154824,-77.209002),US,20879,Retail Store,✓,New_York,2001
```

### Finding Entities with Filters

**Simple**:

_Returns every entity tagged_ `_meter_`_._

**Complex**:

_Returns points that measure temperature, belong to an AHU, and reside in Gaithersburg._

### Data Exchange

Project Haystack specifies a REST API (Zinc / JSON) for:

Navigating or querying entities

Reading / writing historical time-series

Real-time watches

Real-time control (e.g., lighting commands)

**Example (Zinc response)**

```
ver:"3.0"
id,dis,site
@2180b666-430b2363,"Gaithersburg",M
```

---

## Further Information

### Other Example Tags

`ac` – AC electrical quantity/device

`ahu` – Air-handler unit

`ahuRef` – Links a VAV to an AHU

`cmd` – Command/actuator point

`co` – Carbon-monoxide level (`ppm`)

_Full list:_ [**https://project-haystack.org/tag**](https://project-haystack.org/tag)

### Custom Tags

Haystack is extensible. Example:

```
assetId: "GB-HVAC-RTU-1"
```

Links `RTU-1` to an external maintenance system and becomes queryable.

---

## Reference Models

### Example of Tagging Equipment

This work was performed by and for the State of Utah which has graciously offered to contribute it back to the Haystack Community for educational purposes. It provides a detailed tagging model covering building systems including those listed below:

*   AHU
*   FCU
*   VAV
*   Chiller
*   Cooling Tower
*   Boiler
*   Fan
*   Pump
*   Electric
*   Gas
*   Domestic Hot Water

**State of Utah Haystack Tagging Reference Model Example**

> **Note:** This is an active project and may be modified over time.

### Interactive Examples

This website below demonstrates visual examples of Project Haystack data models. A visual network library with a physics engine has been used to model Haystack entities and relationships. This helps to illustrate more complex models and how they relate.

**Project Haystack Visual Examples**

> **Note:**
> 
> *   This website and example models are not representations of commercial Project-Haystack implementations. They are to simply illustrate complex structures for training purposes.
> *   Sections of these examples contain non-standard haystack tags