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
function locationTile(p, withButtons) {
    if (p.locationType === 'Airport' && p.airportIcao) {
        return {
            label: 'Location',
            value: `<a class="entity-link location-place" href="${airportUrl(p.airportIcao)}">${esc(p.airportIcao)}</a>`,
            hint: esc(p.airportName ?? ''),
            // only a free pilot at an airport can travel (the page of the pilot has the button, the other pages only show the place)
            actions: withButtons && p.state === 'Idle' ? '<button type="button" class="btn btn-sm btn-outline-secondary" id="travelButton">Travel</button>' : undefined
        };
    }
    if (p.locationType === 'City' && p.cityName) {
        return {label: 'Location', value: `<span class="location-place">${esc(p.cityName)}</span>`, hint: 'In the city'};
    }
    if (p.locationType === 'Hotel') {
        return {label: 'Location', html: '<span class="location-away">In a hotel</span>'};
    }
    // travelling by itself: where to
    const away = p.state === 'OnDuty' ? 'Piloting an aircraft' : (p.destinationIcao ? 'On the way to ' + esc(p.destinationIcao) : 'On the way');
    return {label: 'Location', html: `<span class="location-away">${away}</span>`};
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
    return {label: 'Awake time', value: value, hint: esc(hint), actions: withButtons ? button : undefined};
}

// A tile with a number which has a limit: green while there is room, orange when it is close to the limit, red over it, and the note of the
// orange and the red states stands right of the number. Nothing is enforced yet, the page only shows the number and the limit.
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
    return {label: label, value: value, hint: esc(hint)};
}

// hours with one digit: 3804 minutes -> '63.4'
function formatHours(minutes) {
    return (Math.round(minutes / 6) / 10).toFixed(1);
}

// The duty in the last 24 hours (the sliding window, not the calendar day): the finished flights of the logbook and the flight in progress up to now,
// each from Start flight to Finish flight. It must not exceed 14 hours; orange from 12 hours.
function dutyTile(p) {
    const d = p.duty;
    if (!d) {
        return {label: 'Duty time, 24 h', html: '<span class="location-away">Unknown</span>'};
    }
    const hint = 'Max ' + formatClock(d.limitMinutes);
    return limitTile('Duty time, 24 h', d.last24HoursMinutes, d.limitMinutes, d.limitMinutes - 120, formatClock, hint,
        {near: 'Close to the duty time limit', over: 'Duty time limit exceeded'});
}
// tiles of the same width, four in a row
function tiles(list) {
    return `
    <div class="row g-3 mb-4">
        ${list.map(t => `
        <div class="col-6 col-md-3">
            <div class="stat${t.actions ? ' has-corner' : ''}${t.placeholder ? ' stat-placeholder' : ''}">
                ${t.actions ? `<div class="stat-corner">${t.actions}</div>` : ''}
                <div class="stat-label">${esc(t.label)}</div>
                ${t.html !== undefined ? `<div class="stat-small">${t.html}</div>` : `<div class="stat-value">${t.value}</div>`}
                ${t.hint ? `<div class="stat-hint" title="${t.hint}">${t.hint}</div>` : ''}
            </div>
        </div>`).join('')}
    </div>`;
}
