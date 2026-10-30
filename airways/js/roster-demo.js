// The roster of the pilot, shared by pilot-roster.html and shadow-jet.html. The flights come from GET /flight-dashboard/my-flights (loadRosterFlights).
// The shape of a flight of the roster, in the order of the departure:
// {id, from, to, dep, arr (UTC millis), reg, type, status, operatorName, sold, remained (null when there is no transport flight), carried (the passengers carried, only of a finished flight, otherwise null), income (the income of the flight, 0 when it has none, null when there is no transport flight), ferry (no transport flight)}.

// The least gap, always: from now to the departure of a flight, and between the arrival of a flight and the departure of the next one. The gaps can be bigger.
// The server checks the same (ShadowJetController.MIN_GAP_SECONDS).
const MIN_GAP_MILLIS = 30 * 60 * 1000;

// What the next booking is bound by, given the booked flights. null when there are no flights: nothing binds the booking.
// keepAircraft: the booking goes on with the same aircraft (the tile "Book the next flight"): it starts at the airport of the arrival of the last flight, with the same
// type and aircraft, not earlier than its arrival plus the least gap (30 minutes).
// Otherwise it is a new flight ("Book ShadowJet flight"): no place is bound, the aircraft and the type are free, only the time is: not earlier than the least gap
// after the arrival of the last flight.
function rosterContinuation(flights, keepAircraft) {
    if (!flights.length) {
        return null;
    }
    const last = flights[flights.length - 1];
    if (!keepAircraft) {
        return {notBefore: last.arr + MIN_GAP_MILLIS};
    }
    return {from: last.to, notBefore: last.arr + MIN_GAP_MILLIS, type: last.type, aircraft: last.reg};
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
        carried: t ? t.carriedPax : null, onBoard: t ? t.onBoard : null, income: t ? t.income : null, ferry: !t, tfStatus: t ? t.status : null
    };
}

// The flights of the roster from my-flights, by the departure; callback(flights), an empty list when my-flights is not loaded
// errorCallback is optional: a page which reloads the list keeps the old one when the request fails; without it the list is empty
function loadRosterFlights(callback, errorCallback) {
    airwaysAuth('GET', '/flight-dashboard/my-flights', {}, function (response) {
        // TODO all the flights of my-flights are shown, the old ones too: the roster must show a part of the history only (the flights of the last days) when there are many
        callback((response.flights || []).map(myFlightToRosterFlight).sort(function (a, b) { return a.dep - b.dep; }));
    }, function () {
        if (errorCallback) {
            errorCallback();
        } else {
            callback([]);
        }
    });
}
