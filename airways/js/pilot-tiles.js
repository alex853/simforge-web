// The tiles of the pilot which the pages of the pilot share (pilot.html, busy-birds.html): the state, the location, the awake time and the duty time.
// Needs js/details.js (esc, airportUrl) and js/requests.js (moneyHtml).

// the state of the person with a plain explanation of what it means for the player
const STATES = {
    Idle: {title: 'Idle', hint: 'You are free'},
    OnDuty: {title: 'On duty', hint: 'You are on a flight'},
    Travelling: {title: 'Travelling', hint: 'You are on the way'},
    Resting: {title: 'Resting', hint: 'You are resting'}
};

function stateTile(p) {
    const s = STATES[p.state] ?? {title: p.state, hint: ''};
    return {label: 'State', value: esc(s.title), hint: esc(s.hint)};
}

// At an airport or in a city the place is a big green title. When the pilot is nowhere (in the flight, on the way) it is a thin quiet line.
// The page of the pilot has the button History (where the pilot has travelled and arrived, the events of the server), the other pages only show the place.
function locationTile(p, withButtons) {
    // History is in the top right corner, Travel to the left of it (on a narrow tile under it): the first button of the list is the rightmost one
    const buttons = [];
    if (withButtons) {
        buttons.push('<button type="button" class="btn btn-sm btn-outline-secondary" id="locationHistoryButton">History</button>');
        if (p.state === 'Idle') {
            buttons.push('<button type="button" class="btn btn-sm btn-outline-secondary" id="travelButton">Travel</button>');
        }
    }
    const actions = buttons.length ? buttons : undefined;
    if (p.locationType === 'Airport' && p.airportIcao) {
        return {
            label: 'Location',
            value: `<a class="entity-link location-place" href="${airportUrl(p.airportIcao)}">${esc(p.airportIcao)}</a>`,
            hint: esc(p.airportName ?? ''),
            // only a free pilot at an airport can travel
            actions: actions
        };
    }
    if (p.locationType === 'City' && p.cityName) {
        return {
            label: 'Location',
            value: `<span class="location-place">${esc(p.cityName)}</span>`,
            hint: 'In the city',
            // a free pilot in a city travels to the airports of the city
            actions: actions
        };
    }
    if (p.locationType === 'Hotel') {
        return {label: 'Location', html: '<span class="location-away">In a hotel</span>', actions: actions};
    }
    // travelling by itself: where to
    const away = p.state === 'OnDuty' ? 'Piloting an aircraft' : (p.destinationIcao ? 'On the way to ' + esc(p.destinationIcao) : (p.destinationCity ? 'On the way to ' + esc(p.destinationCity) : 'On the way'));
    return {label: 'Location', html: `<span class="location-away">${away}</span>`, actions: actions};
}

// The row of the tiles of a travel by airline (the pilot is Travelling by its journey, the server gives p.airlineTravel, the texts are made there): where it goes, what it does now,
// the flight it has found. The row is between the first and the second row of the page of the pilot.
function airlineTravelTiles(p) {
    const a = p.airlineTravel;
    if (!a) {
        return null;
    }
    // 'HH:MM', with the day when it is not today (UTC)
    const clock = function (ms) {
        const d = new Date(ms);
        const hhmm = String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
        return d.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
            ? hhmm : d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', timeZone: 'UTC'}) + ' ' + hhmm;
    };
    let nowHint = a.statusHint ?? '';
    if (a.nextSearchTime) {
        // while the journey looks for a flight the time of the next search is what matters (the city where the pilot waits is in the Location tile)
        const minutes = Math.max(0, Math.round((a.nextSearchTime - Date.now()) / 60000));
        nowHint = 'Next search in ' + (minutes < 1 ? 'a minute' : minutes + ' min');
    }
    const flight = a.route
        ? {label: 'Flight', html: '<span class="fw-semibold text-success" style="font-size:1.15rem">' + esc(a.route) + '</span>',
            hint: esc((a.price > 0 ? 'Ticket ¥' + a.price.toLocaleString() : 'Ticket') + (a.departureTime ? ', departs ' + clock(a.departureTime) + ' UTC' : ''))}
        : {label: 'Flight', html: '<span class="location-away">No flight yet</span>', hint: 'The journey looks for one'};
    // the button of the first tile: not on a flight the travel is cancelled at once; on a flight the pilot cannot get off, so it asks to leave at the next landing (and can change its mind)
    const cancel = a.leaveAtNextLanding
        ? {text: 'Stay on', title: 'You will leave at the next landing: stay on the journey instead'}
        : (a.onFlight ? {text: 'Leave at next landing', title: 'You cannot get off in the air: the journey ends at the next landing'} : {text: 'Cancel', title: 'End the travel here'});
    const cancelButton = '<button type="button" class="btn btn-sm btn-outline-secondary" id="airlineCancelButton" data-leave="' + (a.leaveAtNextLanding ? '1' : '0') + '" data-flight="'
        + (a.onFlight ? '1' : '0') + '" title="' + esc(cancel.title) + '">' + esc(cancel.text) + '</button>';
    return [
        {label: 'Travelling by airline', actions: cancelButton, html: '<span class="fw-semibold text-success" style="font-size:1.15rem">' + esc(a.toCity) + '</span>', hint: esc(a.leaveAtNextLanding ? 'Leaving at the next landing' : 'From ' + a.fromCity)},
        {label: 'Now', html: '<span class="location-away">' + esc(a.status) + '</span>', hint: esc(nowHint)},
        flight
    ];
}

// minutes as a clock with the sign: 750 -> '12:30', -80 -> '\u22121:20'
function formatClock(minutes) {
    const abs = Math.abs(minutes);
    return (minutes < 0 ? '\u2212' : '') + Math.floor(abs / 60) + ':' + String(abs % 60).padStart(2, '0');
}

// the awake time is orange when it is less than this
const AWAKE_NEAR_MINUTES = 4 * 60;

// The time the pilot can still stay awake and active (the awake credit of the server). Sleeping fills it: two hours of the credit for an hour of sleep,
// but a sleep shorter than two hours gives nothing, the most is 16 hours. Below zero the pilot is overtired. The buttons of the tile put the pilot
// to sleep and wake the pilot up; only a free pilot can go to sleep.
function awakeTile(p, withButtons) {
    const a = p.awake;
    if (!a) {
        return {label: 'Awake time', html: '<span class="location-away">Unknown</span>'};
    }
    let value, hint, button;
    if (a.sleeping) {
        // small, on the same line: for how long the pilot has been asleep
        value = '<span>Sleeping <small class="text-secondary fw-normal" style="font-size:.5em">for ' + formatClock(a.sleepMinutes) + '</small></span>';
        // the pilot is not told when it wakes up by itself, only that a usual sleep is 8 to 9 hours (the real time is from 7.5 to 10)
        hint = 'Usual sleep: 8-9 hours';
        button = '<button type="button" class="btn btn-sm btn-outline-secondary" id="wakeButton" title="Under 2 h of sleep gives nothing">Wake up</button>';
    } else {
        // green: four hours or more; orange: less than four hours; red: below zero, the pilot is overtired
        const cls = a.creditMinutes < 0 ? 'duty-over' : (a.creditMinutes < AWAKE_NEAR_MINUTES ? 'duty-near' : 'duty-ok');
        value = '<span class="money ' + cls + '">' + formatClock(a.creditMinutes) + '</span>';
        hint = a.creditMinutes < 0 ? 'You are overtired, you need sleep'
            : (a.creditMinutes < AWAKE_NEAR_MINUTES ? 'Less than ' + formatClock(AWAKE_NEAR_MINUTES) + ' left, plan your sleep' : 'Time left before you need sleep');
        const canSleep = p.state === 'Idle';
        button = '<button type="button" class="btn btn-sm btn-outline-secondary" id="sleepButton"' + (canSleep ? '' : ' disabled title="Only a free pilot can go to sleep"') + '>Sleep</button>';
    }
    // the page of the pilot has the buttons Sleep and Wake up, the other pages only show the number
    return {label: 'Awake time', value: value, hint: esc(hint), actions: withButtons ? button : undefined, over: !a.sleeping && a.creditMinutes < 0};
}

// A tile with a number which has a limit: green while there is room, orange when it is close to the limit, red over it, and the note of the
// orange and the red states stands right of the number. Over the limit the server does not let the pilot start a flight.
// nearMinutes: from how many minutes the number is orange; text: {unknown, near, over} the notes.
function limitTile(label, minutes, limitMinutes, nearMinutes, formatValue, hint, notes) {
    let cls = 'duty-ok';
    let note = '';
    if (minutes > limitMinutes) {
        cls = 'duty-over';
        note = notes.over;
    } else if (minutes >= nearMinutes) {
        cls = 'duty-near';
        note = notes.near;
    }
    const value = '<span class="duty-line"><span class="money ' + cls + '">' + formatValue(minutes) + '</span>'
        + (note ? '<span class="duty-note ' + cls + '">' + note + '</span>' : '') + '</span>';
    // over: the flight can not be started over a limit, the tile page marks the tile
    return {label: label, value: value, hint: esc(hint), over: minutes > limitMinutes};
}

// hours with one digit: 3804 minutes -> '63.4'
function formatHours(minutes) {
    return (Math.round(minutes / 6) / 10).toFixed(1);
}

// The duty in the last 24 hours (the sliding window, not the calendar day): the finished flights of the logbook and the flight in progress up to now,
// each from Start flight to Finish flight. It must not exceed 14 hours; orange from 12 hours.
// The page of the pilot has the button Details (how the number is made: the ribbon of the last 24 hours), the other pages only show the number.
function dutyTile(p, withButtons) {
    const d = p.duty;
    if (!d) {
        return {label: 'Duty time, 24 h', html: '<span class="location-away">Unknown</span>'};
    }
    const hint = 'Max ' + formatClock(d.limitMinutes);
    const tile = limitTile('Duty time, 24 h', d.last24HoursMinutes, d.limitMinutes, d.limitMinutes - 120, formatClock, hint,
        {near: 'Close to the duty time limit', over: 'Duty time limit exceeded'});
    if (withButtons) {
        tile.actions = '<button type="button" class="btn btn-sm btn-outline-secondary" id="dutyButton">Details</button>';
    }
    return tile;
}
// The flight time (blocks off to blocks on, with the flight in progress) in the last 30 days: not more than 80 hours, orange from 70.
function flightTime30Tile(p) {
    const f = p.flightTime;
    if (!f) {
        return {label: 'Flight time, 30 days', html: '<span class="location-away">Unknown</span>'};
    }
    return limitTile('Flight time, 30 days', f.last30DaysMinutes, f.limit30DaysMinutes, f.limit30DaysMinutes - 10 * 60, formatHours,
        'Max ' + (f.limit30DaysMinutes / 60) + ' h',
        {near: 'Close to the limit', over: 'Limit exceeded'});
}

// The same for the last 365 days: not more than 800 hours, orange from 700.
function flightTime365Tile(p) {
    const f = p.flightTime;
    if (!f) {
        return {label: 'Flight time, 365 days', html: '<span class="location-away">Unknown</span>'};
    }
    return limitTile('Flight time, 365 days', f.last365DaysMinutes, f.limit365DaysMinutes, f.limit365DaysMinutes - 100 * 60, formatHours,
        'Max ' + (f.limit365DaysMinutes / 60) + ' h',
        {near: 'Close to the limit', over: 'Limit exceeded'});
}

// tiles of the same width, four in a row
function tiles(list) {
    return `
    <div class="row g-3 mb-4">
        ${list.map(t => `
        <div class="col-6 col-md-3">
            <div class="stat${t.actions ? ' has-corner' : ''}${t.placeholder ? ' stat-placeholder' : ''}">
                ${t.actions ? `<div class="stat-corner${Array.isArray(t.actions) ? ' stat-corner-many' : ''}">${Array.isArray(t.actions) ? t.actions.join('') : t.actions}</div>` : ''}
                <div class="stat-label">${esc(t.label)}</div>
                ${t.html !== undefined ? `<div class="stat-small">${t.html}</div>` : `<div class="stat-value">${t.value}</div>`}
                ${t.hint ? `<div class="stat-hint" title="${t.hint}">${t.hint}</div>` : ''}
            </div>
        </div>`).join('')}
    </div>`;
}
