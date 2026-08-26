# index-table.html — Flight Log Table View

## Overview

A single-page web application that displays a pilot's flight log as a paginated HTML table. It fetches flight records from a remote AWS API Gateway endpoint, renders them in a structured table resembling a traditional pilot logbook, and provides client-side pagination. The page includes a Flight Editor modal that opens on row click and can save updates back to the server.

## Technology Stack

- **jQuery 3.3.1** — DOM manipulation, AJAX requests, event handling
- **Bootstrap** (bundle with Popper.js) — styling, grid layout, modals, buttons
- **common.js** — shared utility functions (`parseHHMM`, `formatMinutesAsHMM`, `showAlert`, `nonEmpty`, `nonEmptyUpperCase`, `nonEmptyInt`, etc.)
- **common-editor.js** — shared editor helpers (`timeEditorKeyPress` for `HH:MM` input)

## Data Source

- **Endpoint**: `https://1fkt6ue7af.execute-api.us-east-1.amazonaws.com/default/fslog`
- **Load**: `GET` with `Authorization` header = `localStorage` key `fslog.token`
- **Update**: `POST` of the full flight record JSON (same pattern as `index.html` / `flight-editor.js` `updateExistingFlight()`)
- **Response format** (load): JSON object with an `Items` array, where each item has:
  - `Type` — record type (only `"flight"` records are used)
  - `Date` — flight date in `YYYY-MM-DD` format
  - `Flight` — nested object containing flight details
  - `Comment`, `Remarks`, `Tags` — optional metadata fields

### Flight fields used by the table / editor

| Field | Used for |
|-------|----------|
| `Flight.AircraftType`, `AircraftRegistration` | Aircraft columns / editor |
| `Flight.Departure`, `Destination` | Route columns / editor |
| `Flight.TimeOut`, `TimeOff`, `TimeOn`, `TimeIn` | Times (table shows Out/In; editor has all four) |
| `Flight.TotalTime` | Total time column + footer totals |
| `Flight.NightTime`, `IFRTime` | OP. COND. TIME columns + footer totals |
| `Flight.LandingsDay`, `LandingsNight` | LANDINGS columns + footer totals |
| `Flight.AirTime`, `Distance`, `Callsign`, `FlightNumber` | Editor (and related) |
| `Comment`, `Remarks`, `Tags` | Table + editor |

## Data Processing

### Filtering
Only records where `Type === 'flight'` and the `Flight` object is present are kept.

### Sorting
Records are sorted chronologically by:
1. `Date` (ascending, lexicographic)
2. `Flight.TimeOut` (ascending, lexicographic) — used as a tiebreaker for same-date flights

## Table Structure

The main table (`#flightlog`) has a two-row header mimicking a pilot logbook layout:

| Column Group    | Sub-columns                  |
|-----------------|------------------------------|
| DATE            | *(single column, spans 2 rows)* |
| AIRCRAFT        | TYPE, REG #                  |
| DEPARTURE       | PLACE, TIME                  |
| ARRIVAL         | PLACE, TIME                  |
| TOTAL TIME OF FLIGHT | *(single column, spans 2 rows)* |
| OP. COND. TIME  | NIGHT (`NightTime`), IFR (`IFRTime`) |
| LANDINGS        | DAY (`LandingsDay`), NIGHT (`LandingsNight`) |
| REMARKS         | *(single column, spans 2 rows)* |
| COMMENTS        | *(single column, spans 2 rows)* |
| TAGS            | *(single column, spans 2 rows)* |

### Row Rendering
- Rows are generated dynamically on page load using a hidden `<table id="flightlogRowTemplate">` as a template.
- Placeholder tokens (`$row$`, `$date$`, `$type$`, `$nightTime$`, `$ifrTime$`, `$landingsDay$`, `$landingsNight$`, etc.) in the template are replaced with actual data.
- Numeric/time cells use `cellValue()` so a real `0` is shown (not treated as empty).
- Rows alternate between `white` and `gray` backgrounds in a pattern: white, white, gray (repeating every 3 rows).
- Clickable rows get a `link` class (pointer cursor). `rowClicked()` populates `#flightEditorModalMap` and opens it.

### Footer / Totals Rows
Three summary rows appear below the data:

| Row               | Description |
|--------------------|-------------|
| **PAGE TOTALS**    | Sums for flights on the current page |
| **PREVIOUS TOTALS**| Sums for all flights on pages before the current one |
| **TOTALS TO DATE** | Cumulative sums from the first flight through the current page |

Each footer row accumulates:

| Column | Source | Display |
|--------|--------|---------|
| TOTAL TIME OF FLIGHT | `Flight.TotalTime` | `H:MM` via `formatMinutesAsHMM()` |
| OP. COND. NIGHT | `Flight.NightTime` | `H:MM` |
| OP. COND. IFR | `Flight.IFRTime` | `H:MM` |
| LANDINGS DAY | `Flight.LandingsDay` | integer sum |
| LANDINGS NIGHT | `Flight.LandingsNight` | integer sum |

Totals are computed by `addToTotals()` and written by `refreshTotals()`.

## Pagination

- **Page size**: 15 rows per page (`rowsPerPage = 15`)
- **Initial page**: After data loads, the view jumps to the **last page** (most recent flights)
- **Controls**: "Prev" / "Next" buttons and a "Page X of Y" indicator below the table
- **Navigation functions**: `prevPage()`, `nextPage()`, with boundary checks via `canGoNext()`

## Date Formatting

- **Table**: `YYYY-MM-DD` → `DD/MM/YYYY` via `reformatDate()`
- **Editor**: filled with storage format `YYYY-MM-DD`

## Tags Formatting

Tags can be either an array or a string. If an array, tags are joined with `", "` for display / editor. On save, comma-separated input is parsed back (single token stays a string; multiple become an array).

## Flight Editor Modal

Single Bootstrap modal: `#flightEditorModalMap` ("Flight Details (with Map)").

### Behavior
- Opens on row click; fields are pre-filled from the clicked record.
- **Save** (`#fem-save-btn`): enabled only when the form is dirty **and** time-field validation passes; `POST`s the updated record; on success refreshes the table and closes the dialog.
- **Close** (`#fem-close-btn`): closes without saving. If dirty, confirms: *"There are some changes, are you sure you want to discard them?"* (same confirm for header X / backdrop via `hide.bs.modal`).
- Dirty tracking compares editable field values against a snapshot taken when the dialog opened. Airport name stub fields, `DATE`, `BLOCKS OFF`, `FLIGHT TIME`, and `AIR TIME` are excluded from dirty/save (the latter two are recalculated from times).
- On save, `BeginningDT` / `Date` (date of flight) / `Flight.TimeOut` / `RecordID` / `UserID` are left unchanged. Local record is updated only after a successful response.
- **Immutable on edit (backend limitation):** `BeginningDT`, date of flight (`Date`), and blocks off (`Flight.TimeOut`) cannot be changed in this dialog. On create they are correlated as `BeginningDT = Date + 'T' + TimeOut`; the backend does not support updating that key/`Date`/`TimeOut` together, so the editor shows `DATE` and `BLOCKS OFF` as read-only and never writes them on save.

### Time-field validation (Save button)
- **Flight time required:** Save is allowed only if `FLIGHT TIME` is populated. It is calculated only when **Blocks Off** and **Blocks On** are both valid 24-hour `HH:MM` values (`00:00`–`23:59` via `parseHHMM`). No flight time ⇒ Save disabled.
- **Air time optional:** Save does **not** require air time.
- **Air time calculation:** Air time is calculated when **Takeoff** and **Landing** are both valid `HH:MM`.
- **Partial / invalid Off–On times:** If Takeoff or Landing has any non-empty text that is **not** a valid `HH:MM`, Save is disabled (even if flight time is present). Empty Takeoff/Landing is allowed.

### Layout
- Left: a map placeholder (450×450) reserved for a future map widget.
- Right: form grouped into sections:
  - FLIGHT and AIRCRAFT on the same horizontal line.
  - FLIGHT: `DATE` (read-only), `CALLSIGN`, `FLIGHT #`
  - AIRCRAFT: `TYPE`, `TAIL #`
  - ROUTE: FROM / TO — ICAO code + airport name stub (names not looked up yet)
  - TIMES and TOTALS on one line: blocks off (read-only) / takeoff / landing / blocks on; flight time / air time (both calculated, read-only) / distance
  - LANDINGS (`DAY`, `NIGHT`) and OP. COND. TIME (`NIGHT`, `IFR`)
  - OTHER: `REMARKS`; `TAGS`; `COMMENT` (textarea)
- Footer buttons: **Save** | **Close**

### Calculated times (same as `flight-editor.js` / `index.html`)
- **Flight time** (`TotalTime`): `TimeIn − TimeOut` (blocks on − blocks off). If negative (overnight), add 24×60 minutes. Shown as `H:MM` via `formatMinutesAsHMM()`.
- **Air time** (`AirTime`): `TimeOn − TimeOff` (landing − takeoff). Same overnight wrap.
- Recalculated on input to takeoff / landing / blocks on (and again on save). `DATE` / blocks off stay fixed; they still feed the flight-time formula.
- `#fem-flighttime` and `#fem-airtime` are read-only; excluded from dirty tracking (dirty comes from the editable time fields).
- Time fields use `timeEditorKeyPress` from `common-editor.js` for `HH:MM` digit entry (auto-insert `:`).

### Styling
- Section headers use a soft gray background (`.fe-section-header`).
- Field labels inside the modal are smaller (~0.67em).
- Landings inputs use `.fe-input-2digits`.
- Modal width: ~70% of the viewport.

## Styling

- Table uses `border-collapse: separate` with 1px spacing and a gray background to create a grid-line effect.
- Font: Tahoma / Verdana / Arial, 12pt.
- Fixed column widths via utility classes (`width40pt`, `width50pt`, `width60pt`, `width70pt`).
- Long-text columns (Remarks, Comments, Tags) use `text-overflow: ellipsis` with `overflow: hidden` and fixed max-widths.

## Key Functions

| Function | Description |
|----------|-------------|
| `totalPages()` | Total pages from flight count and `rowsPerPage` |
| `refreshPage()` | Re-renders current page: totals, row templates, footer, page controls |
| `nextPage()` / `prevPage()` | Page navigation |
| `canGoNext()` | Whether another page exists after the current one |
| `updatePageControls()` | Page indicator text; enables/disables Prev/Next |
| `refreshTotals(rowName, totals)` | Writes total time, night, IFR, landings into a footer row |
| `addToTotals(totals, record)` | Accumulates total/night/IFR minutes and landing counts |
| `cellValue(value)` | Table cell display helper; preserves `0` |
| `reformatDate(date)` | `YYYY-MM-DD` → `DD/MM/YYYY` |
| `formatTags(tags)` | Formats tags array/string for the table |
| `rowClicked(row)` | Opens editor for the clicked flight; snapshots form for dirty tracking |
| `populateEditorFromRecord(record)` | Fills modal inputs from a record; recalculates flight/air time |
| `recalculateFlightTimeFields()` | Sets flight/air time from Out/In and Off/On (overnight-aware) |
| `buildUpdatedRecord(source)` / `applyEditorValuesToRecord(record)` | Builds POST payload from form fields |
| `saveFlightFromModal()` | POSTs update; refreshes table; closes on success |
| `closeFlightEditor()` | Close with discard confirm when dirty |
| `isEditorDirty()` / `isEditorTimeFieldsValid()` / `updateSaveButtonState()` | Dirty + time validation and Save enable/disable |

## Dependencies (from common.js)

| Function / Class | Used For |
|------------------|----------|
| `parseHHMM(timeStr)` | Parsing `HH:MM` time strings into `{h, m, total}` objects |
| `formatMinutesAsHMM(minutes)` | Formatting accumulated minutes back to `H:MM` display |
| `showAlert(message, type)` | Success/error alerts |
| `nonEmpty` / `nonEmptyUpperCase` / `nonEmptyInt` | Normalizing values when building the save payload |
| `timeEditorKeyPress` (common-editor.js) | Restrict digits and auto-insert `:` for time inputs |

## Known Limitations / TODOs

- **Cannot change BeginningDT / Date / TimeOut on edit**: Backend limitation. Edit dialog keeps `#fem-date` and `#fem-blocksoff` read-only; save leaves `BeginningDT`, `Date`, and `Flight.TimeOut` as on the original record (`BeginningDT = Date + 'T' + TimeOut` at create time).
- **No full field validation on save**: Time-field rules gate the Save button; other required-field checks from `flight-editor.js` (aircraft, route, distance, etc.) are not yet mirrored.
- **Airport names always blank**: `#fem-dep-name` / `#fem-arr-name` are stubs; names are not looked up yet.
- **Date format mismatch**: Table shows `DD/MM/YYYY`; editor uses `YYYY-MM-DD`.
- **Night / IFR / landings may be empty on older records**: Table and editor support `NightTime`, `IFRTime`, `LandingsDay`, `LandingsNight`, but older data (or creates from the classic `flight-editor.js` path) may not store them until saved from this dialog.
- **No search or filtering**: All flights are loaded and paginated; no filter by date range, aircraft, route, etc.
- **Map placeholder only**: Map area is not wired to a real map widget yet.
- **Prototype modals removed**: Earlier prototype dialogs were deleted; the active dialog is `#flightEditorModalMap`.

### Flight editor dialog — review findings (2026-08-25)

Still open:
- **Airport names always blank** (see above).
- **Date format mismatch with the table** (see above).
- Layout/polish: fixed `450×450` map can feel crowded; LANDINGS `col-2` is tight; modal has no Bootstrap `fade` class (optional).

Resolved since review:
- Falsy `0` on populate — fixed via `fieldDisplayValue()` / `cellValue()`.
- Save / dirty / discard confirm — implemented (`Save` + `Close`).
- OP. COND. / LANDINGS table columns and footer totals — implemented.
- Docs now match `rowClicked()` populate + save behavior.
