// The roster of the pilot, shared by pilot-roster.html and shadow-jet.html. The flights come from GET /flight-dashboard/my-flights (loadRosterFlights).
// The flights which a ShadowJet booking makes on the page are DEMO ones, they live in the browser until the server books them (demoRoster*), and are shown
// with the real ones. The shape of a flight of the roster, in the order of the departure:
// {id, from, to, dep, arr (UTC millis), reg, type, status, operatorName, sold, remained (null when there is no transport flight), carried (the passengers carried, only of a finished flight, otherwise null), ferry (no transport flight), demo (true for the demo ones)}.

const ROSTER_DEMO_KEY = 'airways.demo.roster';
const TURNAROUND_MILLIS = 30 * 60 * 1000; // the least time between the arrival of a flight and the departure of the next one
const NEW_FLIGHT_GAP_MILLIS = 2 * 60 * 60 * 1000; // a new flight (not the continuation of the aircraft) is not earlier than this after the arrival of the last flight
const DEMO_FLIGHT_MILLIS = 90 * 60 * 1000; // TODO the duration comes from the distance and the type when the server plans the flight

function demoRosterLoad() {
    try {
        const list = JSON.parse(localStorage.getItem(ROSTER_DEMO_KEY));
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

function demoRosterSave(list) {
    try {
        localStorage.setItem(ROSTER_DEMO_KEY, JSON.stringify(list));
    } catch (e) {
        // the demo works without the storage, it just forgets the flights
    }
}

// the flight is added to the end of the roster: a booking is only possible after the last flight
function demoRosterAdd(flight) {
    const list = demoRosterLoad();
    flight.id = (list.reduce(function (max, f) { return Math.max(max, f.id); }, 0)) + 1;
    flight.status = 'Booked';
    list.push(flight);
    demoRosterSave(list);
}

function demoRosterRemoveLast() {
    const list = demoRosterLoad();
    list.pop();
    demoRosterSave(list);
}

function demoRosterReset() {
    demoRosterSave([]);
}

// What the next booking is bound by, given the booked flights. null when there are no flights: nothing binds the booking.
// keepAircraft: the booking goes on with the same aircraft (the tile "Book the next flight"): it starts at the airport of the arrival of the last flight, with the same
// type and aircraft, not earlier than its arrival plus the turnaround.
// Otherwise it is a new flight ("Book ShadowJet flight"): no place is bound, the aircraft and the type are free, only the time is: not earlier than two hours
// after the arrival of the last flight.
function rosterContinuation(flights, keepAircraft) {
    if (!flights.length) {
        return null;
    }
    const last = flights[flights.length - 1];
    if (!keepAircraft) {
        return {notBefore: last.arr + NEW_FLIGHT_GAP_MILLIS};
    }
    return {from: last.to, notBefore: last.arr + TURNAROUND_MILLIS, type: last.type, aircraft: last.reg};
}

// the address of the page of ShadowJet with the continuation in it
function shadowJetHref(continuation) {
    if (!continuation) {
        return 'shadow-jet.html';
    }
    const q = new URLSearchParams({notBefore: String(continuation.notBefore)});
    if (continuation.from) {
        q.set('from', continuation.from);
    }
    if (continuation.type) {
        q.set('type', continuation.type);
        q.set('aircraft', continuation.aircraft);
    }
    return 'shadow-jet.html?' + q.toString();
}


// The flights which are not over yet: the booking can go on after them (the finished and the cancelled flights are over)
function isRosterFlightActive(fl) {
    return fl.status !== 'Finished' && fl.status !== 'Cancelled';
}

// A flight of my-flights as a flight of the roster. my-flights has the date of the flight and the planned times as HH:MM, not the full times:
// TODO the arrival gets its date by the rule "not earlier than the departure", the server must give the full times of the departure and of the arrival
function myFlightToRosterFlight(m) {
    const f = m.flight;
    const dep = Date.parse(f.planDOF + 'T' + f.planDepTime + ':00Z');
    let arr = Date.parse(f.planDOF + 'T' + f.planArrTime + ':00Z');
    if (arr < dep) {
        arr += 86400000;
    }
    const t = m.transportFlight;
    return {
        id: f.id, from: f.depIcao, to: f.destIcao, dep: dep, arr: arr, reg: m.aircraft.regNo, type: m.aircraft.type, status: f.status,
        operatorName: m.aircraft.operatorName, sold: t ? t.soldSeats : null, remained: t ? t.totalSeats - t.soldSeats : null,
        carried: t ? t.carriedPax : null, ferry: !t, demo: false
    };
}

// The flights of the roster: the real ones from my-flights and the demo ones, by the departure; callback(flights), also when my-flights is not loaded
// (then there are the demo ones only)
function loadRosterFlights(callback) {
    const done = function (real) {
        const demo = demoRosterLoad().map(function (fl) { return Object.assign({}, fl, {operatorName: 'ShadowJet', demo: true}); });
        callback(real.concat(demo).sort(function (a, b) { return a.dep - b.dep; }));
    };
    airwaysAuth('GET', '/flight-dashboard/my-flights', {}, function (response) {
        // TODO all the flights of my-flights are shown, the old ones too: the roster must show a part of the history only (the flights of the last days) when there are many
        done((response.flights || []).map(myFlightToRosterFlight));
    }, function () {
        done([]);
    });
}
