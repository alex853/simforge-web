// Shared code for the city / airport / aircraft details pages.
//
// Each page renders from a single backend response: loadCityDetails / loadAirportDetails / loadAircraftDetails.
// Until those endpoints exist, DETAILS_STUBS = true builds the same response shape from the existing endpoints
// plus generated data. Generated parts are listed in response._stub and marked as STUB on the page.

const DETAILS_STUBS = true;

const detailsAirportServiceUrl = 'https://d1.simforge.net:7771';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// ---------------------------------------------------------------------------------------------------------------
// Helpers

function esc(s) {
    return s === null || s === undefined
        ? ''
        : String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}

function queryParam(name) {
    return new URLSearchParams(location.search).get(name);
}

function apiGet(url) {
    return new Promise((resolve, reject) => airwaysGet(url, resolve, () => reject(new Error('error loading ' + url))));
}

function once(fn) {
    let promise;
    return () => promise || (promise = fn());
}

const geoCities = once(() => apiGet('/geo/cities'));
const geoAirports = once(() => apiGet('/geo/airports'));

// Country by ICAO: from /geo/airports (country of the airport's city), then from the airports service as a fallback.
// The airports service says "Unknown" for airports it does not know, such a country gives no flag.
const _airportCountries = {};
const geoAirportCountries = once(() => geoAirports()
    .then(airports => new Map(airports.filter(a => a.country).map(a => [a.icao, a.country])))
    .catch(() => new Map()));

function airportCountry(icao) {
    if (!icao) {
        return Promise.resolve(null);
    }
    const key = icao.toUpperCase();
    if (!_airportCountries[key]) {
        _airportCountries[key] = geoAirportCountries().then(countries => {
            if (countries.has(key)) {
                return countries.get(key);
            }
            return fetch(`${detailsAirportServiceUrl}/v1/airport/info?icao=${encodeURIComponent(key)}`)
                .then(r => r.ok ? r.json() : null)
                .then(info => info?.country && info.country !== 'Unknown' ? info.country : null)
                .catch(() => null);
        });
    }
    return _airportCountries[key];
}

// ---------------------------------------------------------------------------------------------------------------
// Formatting

function pad2(n) {
    return String(n).padStart(2, '0');
}

function fmtTime(iso) {
    if (!iso) {
        return '—';
    }
    const d = new Date(iso);
    return pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes());
}

function fmtDay(iso) {
    if (!iso) {
        return '—';
    }
    return new Date(iso).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', timeZone: 'UTC'});
}

function fmtDuration(minutes) {
    if (minutes === null || minutes === undefined) {
        return '—';
    }
    if (minutes < 0) {
        return '—';
    }
    return Math.floor(minutes / 60) + ':' + pad2(Math.round(minutes % 60));
}

function fmtNumber(n) {
    return n === null || n === undefined ? '—' : Number(n).toLocaleString('en-US');
}

function fmtCompact(n) {
    return n === null || n === undefined
        ? '—'
        : new Intl.NumberFormat('en-US', {notation: 'compact', maximumFractionDigits: 1}).format(n);
}

// ---------------------------------------------------------------------------------------------------------------
// Flags, links, badges

function flagImg(country, size = 16) {
    if (!country) {
        return '';
    }
    return `<img class="flag flag-${size}" src="${getCountryFlagUrl(country, false, size)}" alt="" title="${esc(country)}" onerror="this.remove()">`;
}

function cityUrl(id) {
    return 'city.html?id=' + encodeURIComponent(id);
}

function airportUrl(icao) {
    return 'airport.html?icao=' + encodeURIComponent(icao);
}

function aircraftUrl(id) {
    return 'aircraft.html?id=' + encodeURIComponent(id);
}

// airport: {icao, name?, country?}
function airportRef(airport, withName = true) {
    if (!airport) {
        return '<span class="text-secondary">—</span>';
    }
    const name = withName && airport.name ? ` <span class="text-secondary">${esc(airport.name)}</span>` : '';
    return `<span class="text-nowrap">${flagImg(airport.country)} <a class="entity-link" href="${airportUrl(airport.icao)}">${esc(airport.icao)}</a></span>${name}`;
}

// aircraft: {id, reg}
function aircraftRef(aircraft) {
    return `<a class="entity-link" href="${aircraftUrl(aircraft.id)}">${esc(aircraft.reg)}</a>`;
}

// city: {id, name, country?}
function cityRef(city, withFlag = true) {
    return `<span class="text-nowrap">${withFlag ? flagImg(city.country) + ' ' : ''}<a class="entity-link" href="${cityUrl(city.id)}">${esc(city.name)}</a></span>`;
}

const statusClasses = {
    Scheduled: 'text-bg-secondary',
    Flying: 'text-bg-primary',
    Arrived: 'text-bg-success',
    Cancelled: 'text-bg-danger',
    Active: 'text-bg-success',
    Parked: 'text-bg-secondary'
};

// actual time is bold, estimated is italic grey, planned is plain - same as the flight board
function timeCell(planned, actual, estimated) {
    if (actual) {
        const late = planned && fmtTime(planned) !== fmtTime(actual)
            ? ` <span class="time-planned-small" title="Planned">${fmtTime(planned)}</span>` : '';
        return `<span class="time-actual" title="Actual">${fmtTime(actual)}</span>${late}`;
    }
    if (estimated) {
        return `<span class="time-estimated" title="Estimated">${fmtTime(estimated)}</span>`;
    }
    return `<span title="Planned">${fmtTime(planned)}</span>`;
}

function statusBadge(status) {
    if (!status) {
        return '';
    }
    return `<span class="badge rounded-pill ${statusClasses[status] ?? 'text-bg-light border'}">${esc(status)}</span>`;
}

// ---------------------------------------------------------------------------------------------------------------
// Page building blocks

function entityHeader({kind, title, subtitle, flagCountry, aside}) {
    return `
    <header class="entity-header">
        <div class="flex-grow-1">
            <div class="entity-kind">${esc(kind)}</div>
            <h1 class="entity-title">${flagImg(flagCountry, 32)} ${title}</h1>
            ${subtitle ? `<div class="entity-sub">${subtitle}</div>` : ''}
        </div>
        ${aside ? `<div class="entity-aside">${aside}</div>` : ''}
    </header>`;
}

// The pictures of the pilots. avatars.csv lists the pictures which can be used (columns: file, forbidden), the picture of a pilot is the row of the
// file: avatarId 1 is the first row after the header, 0 is no picture. The files are the 32x32 icons of FatCow in ../fatcow/FatCow_Icons32x32/.
const AVATAR_ICONS_PATH = '../fatcow/FatCow_Icons32x32/';
let avatarListPromise = null;

// the list of the files of avatars.csv in the order of the rows, loaded once; an empty list if it cannot be loaded
function loadAvatarFiles() {
    if (!avatarListPromise) {
        avatarListPromise = fetch('avatars.csv')
            .then(r => r.ok ? r.text() : Promise.reject(new Error('avatars.csv: HTTP ' + r.status)))
            .then(text => text.split(/\r?\n/).slice(1).filter(line => line.trim() !== '').map(line => line.split(',')[0].trim()))
            .catch(e => {
                console.error(e);
                return [];
            });
    }
    return avatarListPromise;
}

// puts the picture into the square of the pilot header (the element has data-avatar-id); nothing is put if the pilot has no picture or the row is not known
function applyPilotAvatar() {
    const square = document.querySelector('.pilot-avatar[data-avatar-id]');
    const avatarId = square ? parseInt(square.dataset.avatarId, 10) : 0;
    if (!square || !(avatarId > 0)) {
        return;
    }
    loadAvatarFiles().then(files => {
        const file = files[avatarId - 1];
        if (!file) {
            return;
        }
        square.innerHTML = '<img src="' + AVATAR_ICONS_PATH + encodeURIComponent(file) + '" alt="" width="64" height="64">';
    });
}

// The header of the pages of the pilot (pilot, qualifications, logbook): the same on all of them, so it does not jump when the pilot switches the
// pages. The avatar (an empty square for now), the kind and the title, and the same three links in the same order, the current page is not a link.
// current: 'pilot' | 'qualifications' | 'logbook'; avatarId: the picture of the pilot (see above), 0 or nothing is the empty square; title is html (the initials on the page of the pilot, the name of the page on the others)
function pilotHeader({current, title, avatarId}) {
    const pages = [
        {key: 'pilot', label: 'Pilot', href: 'pilot.html'},
        {key: 'qualifications', label: 'Qualifications', href: 'pilot-qualifications.html'},
        {key: 'logbook', label: 'Logbook', href: 'pilot-logbook.html'}
    ];
    const menu = pages.map(p => p.key === current
        ? '<span class="pilot-menu-current">' + p.label + '</span>'
        : '<a class="entity-link" href="' + p.href + '">' + p.label + '</a>').join('');
    // the picture is put in when the header is in the page
    setTimeout(applyPilotAvatar, 0);
    return `
    <header class="entity-header pilot-header">
        <div class="pilot-avatar" data-avatar-id="${avatarId > 0 ? avatarId : 0}"></div>
        <div class="flex-grow-1">
            <div class="entity-kind">Pilot</div>
            <h1 class="entity-title">${title}</h1>
        </div>
        <div class="entity-aside pilot-menu">${menu}</div>
    </header>`;
}

// tiles: [{label, value, hint?}], value is html
function statTiles(tiles) {
    return `
    <div class="row g-3 mb-4">
        ${tiles.map(t => `
        <div class="col-6 col-md-3">
            <div class="stat">
                <div class="stat-label">${esc(t.label)}</div>
                ${t.html !== undefined
                    ? `<div class="stat-small">${t.html}</div>`
                    : `<div class="stat-value">${t.value}</div>`}
                ${t.hint ? `<div class="stat-hint">${t.hint}</div>` : ''}
            </div>
        </div>`).join('')}
    </div>`;
}

function section(title, body, {count, stub, tools, id} = {}) {
    return `
    <section class="card section mb-4" ${id ? `id="${id}"` : ''}>
        <div class="card-header">
            <span class="section-title">${esc(title)}</span>
            ${count !== undefined ? `<span class="badge rounded-pill text-bg-light border">${count}</span>` : ''}
            ${stub ? '<span class="badge stub-badge" title="Generated data, backend endpoint is not available yet">STUB</span>' : ''}
            <span class="ms-auto">${tools ?? ''}</span>
        </div>
        ${body}
    </section>`;
}

// columns: [{title, cls?}], rows: arrays of cell html
function dataTable(columns, rows, emptyText = 'Nothing here') {
    if (!rows.length) {
        return `<div class="card-body text-secondary">${esc(emptyText)}</div>`;
    }
    return `
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead><tr>${columns.map(c => `<th class="${c.cls ?? ''}">${c.title}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(r => r.separator !== undefined
                ? `<tr class="separator-row"><td colspan="${columns.length}">${r.separator}</td></tr>`
                : `<tr>${r.map((cell, i) => `<td class="${columns[i].cls ?? ''}">${cell}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
    </div>`;
}

function isStub(response, part) {
    return (response._stub ?? []).includes(part);
}

function stubNote(response) {
    if (!response._stub?.length) {
        return '';
    }
    return `<div class="text-secondary small">Sections marked <span class="badge stub-badge">STUB</span> show generated data (DETAILS_STUBS in js/details.js).</div>`;
}

// Re-render a page keeping the scroll position
function preserveScroll(render) {
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
}

// Calls refresh() every minute while the tab is visible, and when the tab becomes visible after being stale.
// A refresh is skipped while the previous one is still in progress.
function startAutoRefresh(refresh, intervalMs = 60 * 1000) {
    let lastRefresh = Date.now();
    let inProgress = false;

    const tick = () => {
        if (inProgress) {
            return;
        }
        inProgress = true;
        lastRefresh = Date.now();
        Promise.resolve(refresh())
            .catch(e => console.warn('refresh failed', e))
            .finally(() => inProgress = false);
    };

    setInterval(() => {
        if (!document.hidden) {
            tick();
        }
    }, intervalMs);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && Date.now() - lastRefresh >= intervalMs) {
            tick();
        }
    });
}

function showLoading() {
    $('#page').html('<div class="py-5 text-center text-secondary"><div class="spinner-border" role="status"></div></div>');
}

function showError(message) {
    $('#page').html(`<div class="alert alert-warning fs-5">${esc(message)}</div><a href="index.html">Back to map</a>`);
}

// ---------------------------------------------------------------------------------------------------------------
// Data loading

function loadCityDetails(id) {
    if (!DETAILS_STUBS) {
        return apiGet(`/details/city/${encodeURIComponent(id)}`);
    }

    return Promise.all([geoCities(), geoAirports()]).then(([cities, airports]) => {
        const city = cities.find(c => c.id === id);
        if (!city) {
            return null;
        }
        const icaos = city.airports ?? [];
        return Promise.all([
            airportCountry(icaos[0]),
            Promise.all(icaos.map(icao => apiGet(`/map/airport/info?icao=${encodeURIComponent(icao)}`).catch(() => null))),
            Promise.all(icaos.map(icao => airportCountry(icao)))
        ]).then(([country, stats, countries]) => ({
            id: city.id,
            name: city.name,
            country: country,
            population: city.population,
            lat: city.latitude,
            lon: city.longitude,
            airports: icaos.map((icao, i) => ({
                icao: icao,
                name: airports.find(a => a.icao === icao)?.name ?? null,
                country: countries[i],
                flightsOutbound: stats[i]?.flightsOutbound ?? null,
                flightsInbound: stats[i]?.flightsInbound ?? null,
                aircraftActive: stats[i]?.aircraftActive ?? null,
                aircraftParked: stats[i]?.aircraftParked ?? null
            })),
            _stub: []
        }));
    });
}

function loadAirportDetails(icao) {
    if (!DETAILS_STUBS) {
        return apiGet(`/details/airport/${encodeURIComponent(icao)}`);
    }

    // world time of the backend is UTC, but it comes without a zone
    const utc = value => value ? value + 'Z' : null;

    return apiGet(`/map/airport/full-info?icao=${encodeURIComponent(icao)}`).catch(() => null).then(fullInfo => {
        const info = fullInfo?.info;
        if (!info) {
            return null;
        }

        return {
            icao: info.icao,
            name: info.name,
            country: info.country,
            lat: info.lat,
            lon: info.lon,
            cities: info.cities.map(c => ({id: c.id, name: c.name, population: c.population, country: info.country})),
            stats: {
                flightsOutbound: info.flightsOutbound,
                flightsInbound: info.flightsInbound,
                aircraftActive: info.aircraftActive,
                aircraftParked: info.aircraftParked
            },
            topConnections: info.topConnections,
            parkedAircraft: fullInfo.parkedAircraft.map(ac => ({
                id: ac.id,
                reg: ac.reg,
                type: ac.type,
                since: utc(ac.since)
            })),
            facilities: fullInfo.facilities.map(f => ({type: f.type, operator: f.operatorName ?? null})),
            flights: fullInfo.flights.map(f => ({
                id: f.id,
                direction: f.direction,
                status: f.status,
                aircraft: f.aircraft,
                airport: f.airport,
                std: utc(f.std),
                atd: utc(f.atd),
                sta: utc(f.sta),
                eta: utc(f.eta),
                ata: utc(f.ata)
            })),
            _stub: []
        };
    });
}

// FlightMinDto of /map/aircraft/full-info: date of flight + "HH:mm" times.
// Arrival is never earlier than departure of the same kind (planned or actual), so it rolls over to the next day(s);
// actual departure is placed within +-12h of the planned one, as it can be shifted over midnight.
function recentFlightFromDto(f) {
    const base = new Date(f.dof + 'T00:00:00Z').getTime();
    const DAY = 24 * HOUR;
    const hhmmToMs = hhmm => {
        const [h, m] = hhmm.split(':').map(Number);
        return base + (h * 60 + m) * MINUTE;
    };
    const after = (hhmm, from) => {
        if (!hhmm) {
            return null;
        }
        let t = hhmmToMs(hhmm);
        while (from !== null && t < from) {
            t += DAY;
        }
        return t;
    };

    const std = f.pdep ? hhmmToMs(f.pdep) : null;
    let atd = f.adep ? hhmmToMs(f.adep) : null;
    if (atd !== null && std !== null) {
        if (atd < std - 12 * HOUR) {
            atd += DAY;
        } else if (atd > std + 12 * HOUR) {
            atd -= DAY;
        }
    }
    const sta = after(f.parr, std ?? atd);
    const ata = after(f.aarr, atd ?? std);

    return {
        id: f.fmId,
        from: {icao: f.dep},
        to: {icao: f.dest},
        std: stubIso(std),
        atd: stubIso(atd),
        sta: stubIso(sta),
        ata: stubIso(ata),
        minutes: atd !== null && ata !== null ? Math.round((ata - atd) / MINUTE) : null
    };
}

function loadAircraftDetails(id) {
    if (!DETAILS_STUBS) {
        return apiGet(`/details/aircraft/${encodeURIComponent(id)}`);
    }

    return apiGet(`/map/aircraft/full-info?id=${encodeURIComponent(id)}`).catch(() => null).then(fullInfo => {
        const d = fullInfo?.info;
        const details = fullInfo ?? {};
        if (!d) {
            return null;
        }

        // times of AircraftInfoDto are "HH:mm" or "HH:mm+N" (N days after the day of planned departure)
        const flightDay = new Date(stubHhmmToIso(d.pdep) ?? Date.now());
        flightDay.setUTCHours(0, 0, 0, 0);
        const flightTime = value => {
            if (!value) {
                return null;
            }
            const [hhmm, days] = value.split('+');
            const [h, m] = hhmm.split(':').map(Number);
            return stubIso(flightDay.getTime() + ((Number(days ?? 0) * 24 + h) * 60 + m) * MINUTE);
        };

        const hasFlight = d.fmId && d.fmId !== '0' && d.dep;
        const currentFlight = hasFlight ? {
            id: d.fmId,
            from: {icao: d.dep},
            to: {icao: d.dest},
            std: flightTime(d.pdep),
            atd: flightTime(d.atkf),
            sta: flightTime(d.parr),
            eta: flightTime(d.eldg),
            pax: d.pax
        } : null;

        const recentFlights = (details.recentFlights ?? []).map(recentFlightFromDto);

        const result = {
            id: d.id,
            reg: d.acReg,
            type: d.acType,
            operator: {name: d.aoName, country: null},
            opStatus: d.opSt,
            locationStatus: d.lcSt,
            airport: d.lcApt ? {icao: d.lcApt} : null,
            position: d.lat !== null && d.lat !== undefined ? {lat: d.lat, lon: d.lon, alt: d.alt, hdg: d.hdg} : null,
            currentFlight: currentFlight,
            totals: {flightTime: d.fsT, cycles: d.fsC},
            recentFlights: recentFlights,
            lastUpdate: d.lu,
            _stub: []
        };

        // names and countries of the airports come with the response
        [result.airport, currentFlight?.from, currentFlight?.to, ...recentFlights.flatMap(f => [f.from, f.to])]
            .filter(Boolean)
            .forEach(ref => Object.assign(ref, fullInfo.airports?.[ref.icao] ?? {}));

        return result;
    });
}

// ---------------------------------------------------------------------------------------------------------------
// Stub helpers

function stubIso(ms) {
    return ms === null || ms === undefined ? null : new Date(ms).toISOString();
}

// "14:25" -> ISO timestamp within +-12h from now
function stubHhmmToIso(hhmm) {
    if (!hhmm) {
        return null;
    }
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setUTCHours(h, m, 0, 0);
    if (d.getTime() - Date.now() > 12 * HOUR) {
        d.setUTCDate(d.getUTCDate() - 1);
    } else if (Date.now() - d.getTime() > 12 * HOUR) {
        d.setUTCDate(d.getUTCDate() + 1);
    }
    return d.toISOString();
}
