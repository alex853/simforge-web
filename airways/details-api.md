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
- **Unknown id → `404`**. The pages show "not found" for any error. Note that the existing `/map/aircraft/info`, `/map/aircraft/full-info` and `/map/airport/info?icao={icao}` currently return `500` for unknown ids.
- **Times**: ISO 8601 in UTC with `Z`, e.g. `"2026-10-09T14:31:00Z"`. Missing times are `null`.
- **Airport references** (`{icao, name, country}`) appear in many places. Please always include `name` and `country`: the pages show a country flag next to every airport. The pages take `country` from `/geo/airports` (`country` is the country of the most populated city the airport is linked to) and fall back to the airports service (`https://d1.simforge.net:7771/v1/airport/info`), which returns `Unknown` for many airports.
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

**Flight status**: `Scheduled`, `Flying`, `Arrived`. Cancelled flights are not shown.

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
| `airports[]` | AirportRef plus the same counters as `/map/airport/info?icao={icao}` |

The stub uses `/geo/cities`, `/geo/airports` and `/map/airport/info?icao={icao}` for each airport. No generated data.

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
| `cities[]` | `{id, name, population}`, the most populated first, `id` is for linking |
| `stats` | Same as `/map/airport/info?icao={icao}` |
| `topConnections[]` | AirportRef plus `flights` (weekly), same as `topConnections` of `/map/airport/info` |
| `parkedAircraft[]` | Aircraft currently parked here. `since` is the time of arrival. |
| `flights[]` | Active flights (`Flying`), upcoming ones (`Scheduled`, about the next 4h) and recent ones (`Arrived`, last 12h, at most 20 per direction), both directions |
| `flights[].direction` | `out`: departs from this airport. `in`: arrives at this airport. |
| `flights[].airport` | The **other** end of the flight: destination for `out`, origin for `in` |

The page sorts flights itself (Flying → Scheduled → recent, newest first) and filters them by direction.

The stub uses a single call, `/map/airport/full-info?icao=`, which returns `{info, parkedAircraft, flights, facilities}`:

- `info` is the same object as `/map/airport/info`: `icao`, `name`, `country`, `lat`, `lon`, `cities[]`, `topConnections[]` (`{icao, name, country, flights}`) and counters. The page needs nothing else, so it makes a single call. `/map/airport/info` returns 3 top connections, `full-info` returns 10.
- `facilities` is `[{operatorId, operatorName, type}]`, `type` is `BaseAirport` or `BusinessAviationTerminal`. The page shows `type` and `operatorName`.
- `parkedAircraft` is **real**: `[{id, reg, type, since}]`, `since` is the time of the last update of the aircraft (world time, UTC).

- `flights` are **real**: `AirportFlightDto` (`id`, `direction`, `status`, `aircraft {id, reg, type}`, `airport` = `{icao, name, country}` of the other end, `std`/`atd`/`sta`/`eta`/`ata` as world time without zone, UTC). There is no flight number, so the **Flight** column is not shown.

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
| `opStatus`, `locationStatus` | Same values as `opSt`, `lcSt` in `/map/aircraft/info` |
| `operator.country` | Optional. A flag is shown when present. |
| `airport` | AirportRef where the aircraft is parked (`lcApt`), `null` when it is in flight |
| `position` | Last known position, can be `null` |
| `currentFlight` | `null` when the aircraft has no active flight mission |
| `totals.flightTime` | Airframe time `H:MM` (`fsT`). `totals.cycles` is `fsC`. |
| `recentFlights[]` | Last ~10 completed flights, newest first. `minutes` is the flight duration. |

The stub uses a single call, `/map/aircraft/full-info?id=`, which returns `{info, recentFlights}`:

- `info` is the same object as `/map/aircraft/info` (used by the map popup); the stub maps everything except `recentFlights` from it (`pdep`/`atkf`/`parr`/`eldg` are `HH:mm` or `HH:mm+N`, N days after the day of planned departure).
- `recentFlights` are **real** in the stub: finished flights, newest first, up to 10, as `FlightMinDto` with `dof` and `HH:mm` times. The page rebuilds full timestamps from `dof` and rolls times after midnight to the next day. `FlightMinDto` has no flight number and no pax, so the **Flight** and **PAX** columns are not shown. Adding them is not planned.
