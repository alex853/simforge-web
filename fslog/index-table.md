# index-table.html — Flight Log Table View

## Overview

A single-page web application that displays a pilot's flight log as a paginated HTML table. It fetches flight records from a remote AWS API Gateway endpoint, renders them in a structured table resembling a traditional pilot logbook, and provides client-side pagination. The page includes a Flight Editor modal that opens on row click.

## Technology Stack

- **jQuery 3.3.1** — DOM manipulation, AJAX requests, event handling
- **Bootstrap** (bundle with Popper.js) — styling, grid layout, modals, buttons
- **common.js** — shared utility functions (`parseHHMM`, `formatMinutesAsHMM`, `showAlert`, `Record` class, etc.)

## Data Source

- **Endpoint**: `https://1fkt6ue7af.execute-api.us-east-1.amazonaws.com/default/fslog`
- **Method**: `GET`
- **Authentication**: Bearer token read from `localStorage` key `fslog.token`, sent via `Authorization` header
- **Response format**: JSON object with an `Items` array, where each item has:
  - `Type` — record type (only `"flight"` records are used)
  - `Date` — flight date in `YYYY-MM-DD` format
  - `Flight` — nested object containing flight details
  - `Comment`, `Remarks`, `Tags` — optional metadata fields

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
| OP. COND. TIME  | NIGHT, IFR                   |
| LANDINGS        | DAY, NIGHT                   |
| REMARKS         | *(single column, spans 2 rows)* |
| COMMENTS        | *(single column, spans 2 rows)* |
| TAGS            | *(single column, spans 2 rows)* |

### Row Rendering
- Rows are generated dynamically on page load using a hidden `<table id="flightlogRowTemplate">` as a template.
- Placeholder tokens (`$row$`, `$date$`, `$type$`, etc.) in the template are replaced with actual data.
- Rows alternate between `white` and `gray` backgrounds in a pattern: white, white, gray (repeating every 3 rows).
- Clickable rows get a `link` class (pointer cursor). Currently `rowClicked()` only logs to console.

### Footer / Totals Rows
Three summary rows appear below the data:

| Row               | Description |
|--------------------|-------------|
| **PAGE TOTALS**    | Sum of `TotalTime` for flights on the current page |
| **PREVIOUS TOTALS**| Sum of `TotalTime` for all flights on pages before the current one |
| **TOTALS TO DATE** | Cumulative sum of `TotalTime` from the first flight through the current page |

Totals are computed by `addToTotals()` which parses `TotalTime` (HH:MM format) into minutes and accumulates them. The accumulated minutes are formatted back to `H:MM` via `formatMinutesAsHMM()`.

## Pagination

- **Page size**: 15 rows per page (`rowsPerPage = 15`)
- **Initial page**: After data loads, the view jumps to the **last page** (most recent flights)
- **Controls**: "Prev" / "Next" buttons and a "Page X of Y" indicator below the table
- **Navigation functions**: `prevPage()`, `nextPage()`, with boundary checks via `canGoNext()`

## Date Formatting

Dates are converted from `YYYY-MM-DD` (storage format) to `DD/MM/YYYY` (display format) by `reformatDate()`.

## Tags Formatting

Tags can be either an array or a string. If an array, tags are joined with `", "`. Empty or missing tags render as `&nbsp;`.

## Flight Editor Modal

There is a single working Bootstrap modal: `#flightEditorModalMap` ("Flight Details (with Map)"). Clicking any populated row opens this dialog and pre-fills fields from the clicked record (no validation, no saving to server).

Layout overview
- Left: a map placeholder (450×450) reserved for a future map widget.
- Right: form grouped into sections:
  - FLIGHT and AIRCRAFT on the same horizontal line.
    - FLIGHT: `DATE`, `CALLSIGN`, `FLIGHT #`
    - AIRCRAFT: `TYPE`, `TAIL #`
  - ROUTE: two halves — FROM and TO. Each half has two inline inputs: a small code (e.g., EGLL) and an adjacent airport name (e.g., London Heathrow). The name inputs have no labels (one-line with the code input).
  - TIMES and TOTALS on one horizontal line (TIMES on the left):
    - TIMES: `BLOCKS OFF`, `TAKEOFF`, `LANDING`, `BLOCKS ON`
    - TOTALS: `FLIGHT TIME`, `AIR TIME`, `DISTANCE`
  - LANDINGS and OP. COND. TIME on the next horizontal line:
    - LANDINGS (compact): `DAY`, `NIGHT`
    - OP. COND. TIME (narrow): `NIGHT`, `IFR`
    - Empty spacer to the far right for visual balance
  - OTHER: `REMARKS`
  - TAGS: on its own line
  - COMMENT: multiline textarea

Styling
- Section headers use a soft gray background (`.fe-section-header`).
- Field labels inside the modal are smaller for denser layout (about 0.67em).
- Landings inputs use a compact width utility for 2-digit values.
- Modal width: ~70% of the viewport for a balanced, non-vertical look.

## Styling

- Table uses `border-collapse: separate` with 1px spacing and a gray background to create a grid-line effect.
- Font: Tahoma / Verdana / Arial, 12pt.
- Fixed column widths via utility classes (`width40pt`, `width50pt`, `width60pt`, `width70pt`).
- Long-text columns (Remarks, Comments, Tags) use `text-overflow: ellipsis` with `overflow: hidden` and fixed max-widths.

## Key Functions

| Function | Description |
|----------|-------------|
| `totalPages()` | Calculates total number of pages based on flight count and `rowsPerPage` |
| `refreshPage()` | Re-renders the current page: computes totals, fills row templates, updates footer and page controls |
| `nextPage()` / `prevPage()` | Navigate forward/backward through pages |
| `canGoNext()` | Returns `true` if there are more pages after the current one |
| `updatePageControls()` | Updates the page indicator text and enables/disables navigation buttons |
| `refreshTotals(rowName, totals)` | Writes computed totals into the corresponding footer row |
| `addToTotals(totals, record)` | Parses `TotalTime` from a flight record and accumulates it into a totals object |
| `reformatDate(date)` | Converts `YYYY-MM-DD` to `DD/MM/YYYY` |
| `formatTags(tags)` | Formats tags array/string for display |
| `rowClicked(row)` | Click handler — populates `#flightEditorModalMap` with the clicked record's data (date, flight info, aircraft, route, times, totals, conditions, landings, remarks, comment, tags) and opens it |

## Dependencies (from common.js)

| Function / Class | Used For |
|------------------|----------|
| `parseHHMM(timeStr)` | Parsing `HH:MM` time strings into `{h, m, total}` objects |
| `formatMinutesAsHMM(minutes)` | Formatting accumulated minutes back to `H:MM` display |
| `showAlert(message, type)` | Displaying error alerts (used in AJAX error handler) |

## Known Limitations / TODOs

- **Flight editor read-only**: `rowClicked()` opens the `#flightEditorModalMap` dialog and populates fields from the clicked flight record. No data validation or saving to the server is implemented yet.
- **Incomplete table columns**: OP. COND. TIME (Night, IFR) and LANDINGS (Day, Night) columns exist in the header/footer but are not populated with data in the row template.
- **No error UI**: On data load failure, an alert is shown via `showAlert()` but only if the function is available.
- **No search or filtering**: All flights are loaded and paginated; there is no way to filter by date range, aircraft, route, etc.
- **Prototype modals removed**: Earlier prototype dialogs (`#flightEditorModal`, `#flightEditorModal1`, `#flightEditorModal2`, `#flightEditorModal3`, `#flightEditorModal4`) have been deleted from the page. The single active dialog is `#flightEditorModalMap`.
