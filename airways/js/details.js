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

// Country by ICAO from the airports service, every ICAO is requested once
const _airportCountries = {};

function airportCountry(icao) {
    if (!icao) {
        return Promise.resolve(null);
    }
    const key = icao.toUpperCase();
    if (!_airportCountries[key]) {
        _airportCountries[key] = fetch(`${detailsAirportServiceUrl}/v1/airport/info?icao=${encodeURIComponent(key)}`)
            .then(r => r.ok ? r.json() : null)
            .then(info => info?.country ?? null)
            .catch(() => null);
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

function countryFlagUrl(country, size) {
    let flagName = country.toLowerCase().replaceAll(' ', '_');

    if (country === "Ascension Island") {
        flagName = "saint_helena";
    } else if (country === "Cote d'Ivoire") {
        flagName = "cote_divoire";
    } else if (country === "Bahamas, The") {
        flagName = "bahamas";
    } else if (country === "Bosnia and Herzegovina") {
        flagName = "bosnia";
    } else if (country === "Timor-Leste") {
        flagName = "east_timor";
    } else if (country === "Fiji Islands") {
        flagName = "fiji";
    } else if (country === "Gambia, The") {
        flagName = "gambia";
    } else if (country === "Maldives") {
        flagName = "maledives";
    } else if (country === "Netherlands, The") {
        flagName = "netherlands";
    } else if (country === "Serbia and Montenegro") {
        flagName = "serbia_montenegro";
    } else if (country === "United Kingdom") {
        flagName = "great_britain";
    } else if (country === "United States") {
        flagName = "usa";
    }

    return `../fatcow/FatCow_Icons${size}x${size}/flag_${flagName}.png`;
}

function flagImg(country, size = 16) {
    if (!country) {
        return '';
    }
    return `<img class="flag flag-${size}" src="${countryFlagUrl(country, size)}" alt="" title="${esc(country)}" onerror="this.remove()">`;
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
function cityRef(city) {
    return `<span class="text-nowrap">${flagImg(city.country)} <a class="entity-link" href="${cityUrl(city.id)}">${esc(city.name)}</a></span>`;
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

// tiles: [{label, value, hint?}], value is html
function statTiles(tiles) {
    return `
    <div class="row g-3 mb-4">
        ${tiles.map(t => `
        <div class="col-6 col-md-3">
            <div class="stat">
                <div class="stat-label">${esc(t.label)}</div>
                <div class="stat-value">${t.value}</div>
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
            <tbody>${rows.map(r => `<tr>${r.map((cell, i) => `<td class="${columns[i].cls ?? ''}">${cell}</td>`).join('')}</tr>`).join('')}</tbody>
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
            Promise.all(icaos.map(icao => apiGet(`/geo/airport/${encodeURIComponent(icao)}/details`).catch(() => null))),
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

    return Promise.all([
        geoCities(),
        geoAirports(),
        apiGet(`/geo/airport/${encodeURIComponent(icao)}/details`).catch(() => null),
        apiGet('/map/aircraft/flying').catch(() => [])
    ]).then(([cities, airports, details, flying]) => {
        const airport = airports.find(a => a.icao === icao);
        if (!airport) {
            return null;
        }

        const rnd = seededRandom(icao + stubTimeBucket());
        const pickAircraft = stubAircraftPicker(flying, rnd);

        const parkedAircraft = [];
        const parkedCount = Math.min(details?.aircraftParked ?? 4, 12);
        const parkedIds = new Set();
        for (let i = 0; i < parkedCount * 3 && parkedAircraft.length < parkedCount; i++) {
            const ac = pickAircraft();
            if (parkedIds.has(ac.id)) {
                continue;
            }
            parkedIds.add(ac.id);
            parkedAircraft.push({
                id: ac.id,
                reg: ac.reg,
                type: ac.type,
                operator: ac.operator,
                since: stubIso(Date.now() - rnd() * 36 * HOUR)
            });
        }

        const flights = [];
        const plan = [['out', 'Flying', 4], ['in', 'Flying', 4], ['out', 'Scheduled', 3], ['in', 'Scheduled', 3], ['out', 'Arrived', 4], ['in', 'Arrived', 4]];
        plan.forEach(([direction, status, count]) => {
            for (let i = 0; i < count; i++) {
                const other = stubPickNearAirport(airport, airports, rnd);
                const times = stubFlightTimes(direction, status, flightMinutes(distanceNm(airport, other)), rnd);
                flights.push(Object.assign({
                    id: stubId(rnd),
                    flightNo: stubFlightNo(rnd),
                    direction: direction,
                    status: status,
                    aircraft: pickAircraft(),
                    airport: {icao: other.icao}
                }, times));
            }
        });

        const result = {
            icao: airport.icao,
            name: airport.name,
            country: null,
            lat: airport.latitude,
            lon: airport.longitude,
            cities: (details?.connectedCities ?? []).map(name => {
                const city = cities.find(c => c.name === name && (c.airports ?? []).includes(icao))
                    ?? cities.find(c => c.name === name);
                return {id: city?.id ?? null, name: name, population: city?.population ?? null};
            }),
            stats: {
                flightsOutbound: details?.flightsOutbound ?? null,
                flightsInbound: details?.flightsInbound ?? null,
                aircraftActive: details?.aircraftActive ?? null,
                aircraftParked: details?.aircraftParked ?? null
            },
            topConnections: (details?.top3connections ?? []).map(c => ({icao: c.icao, flights: c.flights})),
            parkedAircraft: parkedAircraft,
            flights: flights,
            _stub: ['parkedAircraft', 'flights']
        };

        return Promise.all([
            airportCountry(icao).then(country => {
                result.country = country;
                result.cities.forEach(c => c.country = country);
            }),
            stubFillAirportRefs([...result.topConnections, ...result.flights.map(f => f.airport)])
        ]).then(() => result);
    });
}

function loadAircraftDetails(id) {
    if (!DETAILS_STUBS) {
        return apiGet(`/details/aircraft/${encodeURIComponent(id)}`);
    }

    return Promise.all([
        apiGet(`/map/aircraft/details?id=${encodeURIComponent(id)}`).catch(() => null),
        geoAirports()
    ]).then(([d, airports]) => {
        if (!d) {
            return null;
        }

        const hasFlight = d.fmId && d.fmId !== '0' && d.dep;
        const currentFlight = hasFlight ? {
            id: d.fmId,
            from: {icao: d.dep},
            to: {icao: d.dest},
            std: stubHhmmToIso(d.pdep),
            atd: stubHhmmToIso(d.atkf),
            sta: stubHhmmToIso(d.parr),
            eta: stubHhmmToIso(d.eldg),
            pax: d.pax
        } : null;

        // recent flights are generated backwards in time, ending where the aircraft is now
        const rnd = seededRandom(id + stubTimeBucket());
        let cursor = airports.find(a => a.icao === (hasFlight ? d.dep : d.lcApt))
            ?? airports[Math.floor(rnd() * airports.length)];
        let cursorTime = hasFlight && currentFlight.atd
            ? new Date(currentFlight.atd).getTime()
            : Date.now() - rnd() * 6 * HOUR;
        const recentFlights = [];
        for (let i = 0; i < 10; i++) {
            const from = stubPickNearAirport(cursor, airports, rnd);
            const minutes = flightMinutes(distanceNm(from, cursor));
            const ata = cursorTime - (40 + rnd() * 80) * MINUTE;
            const atd = ata - minutes * MINUTE;
            const std = atd - Math.round(rnd() * 20) * MINUTE;
            recentFlights.push({
                id: stubId(rnd),
                flightNo: stubFlightNo(rnd),
                from: {icao: from.icao},
                to: {icao: cursor.icao},
                std: stubIso(std),
                atd: stubIso(atd),
                sta: stubIso(std + minutes * MINUTE),
                ata: stubIso(ata),
                minutes: minutes,
                pax: 60 + Math.round(rnd() * 120)
            });
            cursor = from;
            cursorTime = atd;
        }

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
            _stub: ['recentFlights']
        };

        return stubFillAirportRefs([
            result.airport,
            currentFlight?.from,
            currentFlight?.to,
            ...recentFlights.flatMap(f => [f.from, f.to])
        ]).then(() => result);
    });
}

// ---------------------------------------------------------------------------------------------------------------
// Stub data generation

function seededRandom(seed) {
    let a = 0;
    for (let i = 0; i < seed.length; i++) {
        a = ((a << 5) - a + seed.charCodeAt(i)) | 0;
    }
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// generated data stays the same for 10 minutes
function stubTimeBucket() {
    return String(Math.floor(Date.now() / (10 * MINUTE)));
}

function stubId(rnd) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = '';
    for (let i = 0; i < 5; i++) {
        s += chars[Math.floor(rnd() * chars.length)];
    }
    return s;
}

function stubFlightNo(rnd) {
    return 'SJ' + (100 + Math.floor(rnd() * 900));
}

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

// real aircraft ids from the map so that links work, types are made up
function stubAircraftPicker(flying, rnd) {
    const types = ['A319', 'A320', 'A321', 'B737', 'B738'];
    const pool = flying.length ? flying : [{id: 'stub0', acReg: 'SJ-AAA'}];
    return () => {
        const ac = pool[Math.floor(rnd() * pool.length)];
        let h = 0;
        for (let i = 0; i < ac.id.length; i++) {
            h = (h * 31 + ac.id.charCodeAt(i)) | 0;
        }
        return {id: ac.id, reg: ac.acReg, type: types[Math.abs(h) % types.length], operator: 'ShadowJet'};
    };
}

function stubPickNearAirport(origin, airports, rnd) {
    const others = airports.filter(a => a.icao !== origin.icao);
    const near = others.filter(a => {
        const d = distanceNm(origin, a);
        return d > 100 && d < 2000;
    });
    const list = near.length ? near : others;
    return list[Math.floor(rnd() * list.length)];
}

// times of a flight seen from the airport page, direction 'out' or 'in'
function stubFlightTimes(direction, status, minutes, rnd) {
    const now = Date.now();
    const duration = minutes * MINUTE;
    let std;
    let atd = null;
    let ata = null;
    if (status === 'Scheduled') {
        std = now + (10 + rnd() * 240) * MINUTE;
    } else {
        if (status === 'Flying') {
            atd = now - (0.05 + rnd() * 0.85) * duration;
        } else {
            atd = now - duration - rnd() * (direction === 'out' ? 10 : 12) * HOUR;
            ata = atd + duration;
        }
        std = atd - Math.round(rnd() * 20) * MINUTE;
    }
    return {
        std: stubIso(std),
        atd: stubIso(atd),
        sta: stubIso(std + duration),
        eta: stubIso(atd !== null ? atd + duration : null),
        ata: stubIso(ata)
    };
}

function stubFillAirportRefs(refs) {
    return geoAirports().catch(() => []).then(airports => Promise.all(refs.filter(Boolean).map(ref => {
        if (ref.name === undefined) {
            ref.name = airports.find(a => a.icao === ref.icao)?.name ?? null;
        }
        return airportCountry(ref.icao).then(country => ref.country = country);
    })));
}

function distanceNm(a, b) {
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
    return 3440.065 * 2 * Math.asin(Math.sqrt(h));
}

function flightMinutes(distance) {
    return Math.round(distance / 420 * 60 + 25);
}
