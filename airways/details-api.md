# Details pages — backend API

## Overview

The map (`index.html`) popups for cities, airports and aircraft have a **Details** button which opens one of three pages:

| Page | URL | Backend call |
|------|-----|--------------|
| City | `city.html?id={cityId}` | `GET /details/city/{id}` |
| Airport | `airport.html?icao={ICAO}` | `GET /details/airport/{icao}` |
| Aircraft | `aircraft.html?id={aircraftId}` | `GET /details/aircraft/{id}` |

The pages link to each other (airport ↔ city, airport ↔ aircraft, flights → aircraft/airports).

Each page renders from a **single** backend response. The calls are made in `js/details.js` by `loadCityDetails`, `loadAirportDetails` and `loadAircraftDetails`.

The endpoints are **not implemented yet**. While `DETAILS_STUBS = true` (in `js/details.js`), every loader builds the same response shape from existing endpoints plus generated data. The generated parts are listed in `response._stub` and are marked with a **STUB** badge on the page. Once the backend is ready, set `DETAILS_STUBS = false`.

## General requirements

- **Base URL**: `airwaysServiceUrl` from `js/requests.js` (`https://d1.simforge.net:7776`), called via `airwaysGet`.
- **Public**: no authentication. The pages are for public use, so they must not depend on `/admin/*` endpoints.
- **Unknown id → `404`**. The pages show "not found" for any error. Note that the existing `/map/aircraft/details` and `/geo/airport/{icao}/details` currently return `500` for unknown ids.
- **Times**: ISO 8601 in UTC with `Z`, e.g. `"2026-10-09T14:31:00Z"`. Missing times are `null`.
- **Airport references** (`{icao, name, country}`) appear in many places. Please always include `name` and `country`: the pages show a country flag next to every airport. The stubs currently get `country` from the airports service (`https://d1.simforge.net:7771/v1/airport/info`), one call per ICAO.
- **Country**: the full country name as returned by the airports service (e.g. `"United Kingdom"`, `"Bahamas, The"`). The pages map it to a FatCow flag icon (`countryFlagUrl` in `js/details.js`).

## Common objects

**AirportRef**

```json
{ "icao": "EDDF", "name": "Frankfurt/Main", "country": "Germany" }
```

**AircraftRef**

```json
{ "id": "eyR97", "reg": "SJ-GUK", "type": "A320" }
```

**Flight times**

| Field | Meaning |
|-------|---------|
| `std` | Scheduled time of departure |
| `atd` | Actual time of departure (`null` until departed) |
| `sta` | Scheduled time of arrival |
| `eta` | Estimated time of arrival (`null` until departed) |
| `ata` | Actual time of arrival (`null` until arrived) |

The pages show actual times in bold, estimated times in grey italic and planned times as plain text, the same as `tech/flight-board.html`.

**Flight status**: `Scheduled`, `Flying`, `Arrived`, `Cancelled`.

---

## GET /details/city/{id}

`id` is the city id, as in `/geo/cities`.

```json
{
  "id": "htGf6",
  "name": "London",
  "country": "United Kingdom",
  "population": 7593300,
  "lat": 51.519985,
  "lon": -0.09999277,
  "airports": [
    {
      "icao": "EGLL",
      "name": "Heathrow",
      "country": "United Kingdom",
      "flightsOutbound": 28,
      "flightsInbound": 34,
      "aircraftActive": 11,
      "aircraftParked": 18
    }
  ]
}
```

| Field | Notes |
|-------|-------|
| `country` | Missing today: `/geo/cities` only has `countryId`. The stub takes it from the airports service using the city's first airport. |
| `airports[]` | AirportRef plus the same counters as `/geo/airport/{icao}/details` |

The stub uses `/geo/cities`, `/geo/airports` and `/geo/airport/{icao}/details` for each airport. No generated data.

---

## GET /details/airport/{icao}

`icao` is uppercase.

```json
{
  "icao": "EGLL",
  "name": "Heathrow",
  "country": "United Kingdom",
  "lat": 51.4775,
  "lon": -0.46138293,
  "cities": [
    { "id": "htGf6", "name": "London", "population": 7593300 }
  ],
  "stats": {
    "flightsOutbound": 28,
    "flightsInbound": 34,
    "aircraftActive": 11,
    "aircraftParked": 18
  },
  "topConnections": [
    { "icao": "EDDF", "name": "Frankfurt/Main", "country": "Germany", "flights": 160 }
  ],
  "parkedAircraft": [
    { "id": "eyR97", "reg": "SJ-GUK", "type": "A320", "operator": "ShadowJet", "since": "2026-10-09T12:53:00Z" }
  ],
  "flights": [
    {
      "id": "Xk3Pq",
      "flightNo": "SJ123",
      "direction": "out",
      "status": "Flying",
      "aircraft": { "id": "eyR97", "reg": "SJ-GUK", "type": "A320" },
      "airport": { "icao": "EDDF", "name": "Frankfurt/Main", "country": "Germany" },
      "std": "2026-10-09T13:08:00Z",
      "atd": "2026-10-09T13:23:00Z",
      "sta": "2026-10-09T14:40:00Z",
      "eta": "2026-10-09T14:55:00Z",
      "ata": null
    }
  ]
}
```

| Field | Notes |
|-------|-------|
| `cities[]` | Needs `id` for linking. `/geo/airport/{icao}/details` returns only names in `connectedCities`. |
| `stats` | Same as `/geo/airport/{icao}/details` |
| `topConnections[]` | AirportRef plus `flights` (weekly), same as `top3connections` |
| `parkedAircraft[]` | Aircraft currently parked here. `since` is the time of arrival. |
| `flights[]` | Active flights (`Flying`), upcoming ones (`Scheduled`, about the next 4h) and recent ones (`Arrived`/`Cancelled`, about the last 12–24h), both directions |
| `flights[].direction` | `out`: departs from this airport. `in`: arrives at this airport. |
| `flights[].airport` | The **other** end of the flight: destination for `out`, origin for `in` |

The page sorts flights itself (Flying → Scheduled → recent, newest first) and filters them by direction.

**Stubbed** (`_stub`): `parkedAircraft` and `flights`. Real aircraft ids and registrations from `/map/aircraft/flying` are used, so the links work, but types, operators, routes and times are made up.

---

## GET /details/aircraft/{id}

`id` is the aircraft id, as in `/map/aircraft/flying`.

```json
{
  "id": "eyR97",
  "reg": "SJ-GUK",
  "type": "A320",
  "operator": { "name": "ShadowJet", "country": null },
  "opStatus": "Active",
  "locationStatus": "Flying",
  "airport": null,
  "position": { "lat": 36.513172, "lon": -88.89781, "alt": 30006, "hdg": 215 },
  "currentFlight": {
    "id": "YRipN",
    "flightNo": "SJ456",
    "from": { "icao": "CYYZ", "name": "Toronto/Pearson Intl", "country": "Canada" },
    "to": { "icao": "KIAH", "name": "G Bush Intercontinental/Houston", "country": "United States" },
    "std": "2026-10-09T14:25:00Z",
    "atd": "2026-10-09T14:31:00Z",
    "sta": "2026-10-09T17:27:00Z",
    "eta": "2026-10-09T17:13:00Z",
    "pax": 0
  },
  "totals": { "flightTime": "868:44", "cycles": 581 },
  "recentFlights": [
    {
      "id": "Ab12C",
      "flightNo": "SJ152",
      "from": { "icao": "KNZJ", "name": "El Toro", "country": "United States" },
      "to": { "icao": "CYYZ", "name": "Toronto/Pearson Intl", "country": "Canada" },
      "std": "2026-10-09T08:36:00Z",
      "atd": "2026-10-09T08:42:00Z",
      "sta": "2026-10-09T13:27:00Z",
      "ata": "2026-10-09T13:33:00Z",
      "minutes": 291,
      "pax": 106
    }
  ],
  "lastUpdate": "2026-10-09T16:10:14Z"
}
```

| Field | Notes |
|-------|-------|
| `opStatus`, `locationStatus` | Same values as `opSt`, `lcSt` in `/map/aircraft/details` |
| `operator.country` | Optional. A flag is shown when present. |
| `airport` | AirportRef where the aircraft is parked (`lcApt`), `null` when it is in flight |
| `position` | Last known position, can be `null` |
| `currentFlight` | `null` when the aircraft has no active flight mission |
| `totals.flightTime` | Airframe time `H:MM` (`fsT`). `totals.cycles` is `fsC`. |
| `recentFlights[]` | Last ~10 completed flights, newest first. `minutes` is the flight duration. |

The stub maps everything except `recentFlights` from `/map/aircraft/details?id=` (`pdep`/`atkf`/`parr`/`eldg` are `HH:mm`, assumed to be UTC).

**Stubbed** (`_stub`): `recentFlights`. This is a generated chain of flights that ends where the aircraft is now.
