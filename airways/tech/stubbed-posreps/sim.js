// A scripted flight for the page of the stubbed posreps (tech/stubbed-posreps): the aircraft starts its engines, taxis, takes off, flies directly to the
// destination, lands, taxis in and shuts down. It is for debugging the code of the sim tracker without a sim: the page sends the state as posreps
// (the same fields the FlightBag of the sim sends).
//
// The state is kept in localStorage with the time of its last update; update() catches up second by second to the current time, so a flight goes on
// through page reloads as if the page had stayed open.
//
// Every phase shows a countdown to the next one ("0:33 till engine startup"): exact for the timed phases, estimated from the speed and distance for the others.
//
// Phases: parked -> waiting ("Let's fly" pressed: 60 s, everything still off) -> engines (60 s, engines on, parking brake set) -> taxi-out (180 s at 20 kt
// towards the destination) -> takeoff (accelerates to 180 kt, then airborne) -> airborne (480 kt; slows down to 160 kt in time to fly the last 5 nm
// at it; climbs to the cruise level, 200 ft per nm of distance, 3000-45000 ft; descends on a 3 degree path to touch down 1.5 nm before the destination's
// reference point) -> rollout (brakes to 20 kt) -> taxi-in (180 s at 20 kt) -> stopped (60 s, parking brake set) -> finished (engines off).
// Idle (parked, parkAt): the aircraft stands at an airport.
//
// Divert: before the touchdown the destination may be changed any number of times; the aircraft turns to the new one from where it is (and keeps
// going as long as it is not near the destination, so it may be held in the air for hours). The fuel is not simulated.

const SIM_KEY = "airways.stubbed-posreps.sim";

const PosrepSim = (function () {
    const EARTH_RADIUS_NM = 3440.065;
    const TAXI_KT = 20;
    const ROTATE_KT = 180;
    const CRUISE_KT = 480;
    const APPROACH_KT = 160;
    const APPROACH_STABLE_NM = 5;      // the last nm before touchdown flown at the approach speed
    const TOUCHDOWN_BEFORE_NM = 1.5;   // touches down this far before the destination's reference point
    const GLIDE_FT_PER_NM = 300;       // ~3 degrees
    const CLIMB_FPM = 2500;
    const DESCENT_FPM = 3000;
    const TAKEOFF_ACCEL_KTS = 4;       // kt per second
    const AIR_ACCEL_KTS = 2;
    const ROLLOUT_DECEL_KTS = 3;
    const PHASE_SECONDS = { waiting: 60, engines: 60, "taxi-out": 180, "taxi-in": 180, stopped: 60 };
    const DIVERT_PHASES = ['waiting', 'engines', 'taxi-out', 'takeoff', 'airborne'];

    const LABELS = {
        parked: "Parked", waiting: "Ready", engines: "Engines running", "taxi-out": "Taxiing out", takeoff: "Takeoff roll",
        airborne: "Airborne", rollout: "Landing rollout", "taxi-in": "Taxiing in", stopped: "Stopped", finished: "Finished"
    };

    const rad = deg => deg * Math.PI / 180;
    const deg = r => r * 180 / Math.PI;

    function distanceNm(lat1, lon1, lat2, lon2) {
        const dLat = rad(lat2 - lat1);
        const dLon = rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * EARTH_RADIUS_NM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function bearingDeg(lat1, lon1, lat2, lon2) {
        const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
        const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
        return (deg(Math.atan2(y, x)) + 360) % 360;
    }

    function movePoint(lat, lon, headingDeg, nm) {
        const d = nm / EARTH_RADIUS_NM;
        const h = rad(headingDeg);
        const lat1 = rad(lat);
        const lon1 = rad(lon);
        const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(h));
        const lon2 = lon1 + Math.atan2(Math.sin(h) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
        return { lat: deg(lat2), lon: ((deg(lon2) + 540) % 360) - 180 };
    }

    function approach(value, target, maxStep) {
        return value < target ? Math.min(target, value + maxStep) : Math.max(target, value - maxStep);
    }

    function load() {
        try {
            const raw = localStorage.getItem(SIM_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function save(state) {
        try {
            if (state) {
                localStorage.setItem(SIM_KEY, JSON.stringify(state));
            } else {
                localStorage.removeItem(SIM_KEY);
            }
        } catch (e) {
            // the page just forgets the flight
        }
    }

    function enterPhase(state, phase) {
        state.phase = phase;
        state.phaseStart = state.updatedAt;
    }

    // One step of dt seconds of simulated time.
    function step(state, dt) {
        const elapsed = (state.updatedAt - state.phaseStart) / 1000;
        const to = state.to;
        const distToGo = distanceNm(state.lat, state.lon, to.lat, to.lon);
        if (state.phase === 'taxi-out' || state.phase === 'takeoff' || state.phase === 'airborne') {
            state.heading = bearingDeg(state.lat, state.lon, to.lat, to.lon); // straight to the destination
        }

        switch (state.phase) {
            case 'waiting':
                if (elapsed >= PHASE_SECONDS.waiting) {
                    state.engines = 1;
                    enterPhase(state, 'engines');
                }
                break;
            case 'engines':
                if (elapsed >= PHASE_SECONDS.engines) {
                    state.brake = 0;
                    state.speed = TAXI_KT;
                    enterPhase(state, 'taxi-out');
                }
                break;
            case 'taxi-out':
                if (elapsed >= PHASE_SECONDS['taxi-out']) {
                    enterPhase(state, 'takeoff');
                }
                break;
            case 'takeoff':
                state.speed = Math.min(ROTATE_KT, state.speed + TAKEOFF_ACCEL_KTS * dt);
                if (state.speed >= ROTATE_KT) {
                    state.onGround = 0;
                    enterPhase(state, 'airborne');
                }
                break;
            case 'airborne': {
                const targetSpeed = slowingDown(state, distToGo) ? APPROACH_KT : CRUISE_KT;
                state.speed = approach(state.speed, targetSpeed, AIR_ACCEL_KTS * dt);
                const pathAlt = to.elevation + Math.max(0, distToGo - TOUCHDOWN_BEFORE_NM) * GLIDE_FT_PER_NM;
                const targetAlt = Math.min(state.cruiseAlt, pathAlt);
                const rate = targetAlt > state.alt ? CLIMB_FPM : DESCENT_FPM;
                state.alt = approach(state.alt, targetAlt, rate * dt / 60);
                if (distToGo <= TOUCHDOWN_BEFORE_NM) {
                    state.alt = to.elevation;
                    state.onGround = 1;
                    enterPhase(state, 'rollout');
                }
                break;
            }
            case 'rollout':
                state.speed = Math.max(TAXI_KT, state.speed - ROLLOUT_DECEL_KTS * dt);
                if (state.speed <= TAXI_KT) {
                    enterPhase(state, 'taxi-in');
                }
                break;
            case 'taxi-in':
                if (elapsed >= PHASE_SECONDS['taxi-in']) {
                    state.speed = 0;
                    state.brake = 1;
                    enterPhase(state, 'stopped');
                }
                break;
            case 'stopped':
                if (elapsed >= PHASE_SECONDS.stopped) {
                    state.engines = 0;
                    enterPhase(state, 'finished');
                }
                break;
            default:
                break; // parked, finished: nothing moves
        }

        if (state.speed > 0) {
            const moved = movePoint(state.lat, state.lon, state.heading, state.speed * dt / 3600);
            state.lat = moved.lat;
            state.lon = moved.lon;
        }
    }

    // Seconds until the next phase and what it is: exact for the timed phases, estimated from speed and distance for the others. null when nothing comes next.
    function nextStep(state) {
        const elapsed = (state.updatedAt - state.phaseStart) / 1000;
        const timed = (phase, label) => ({ seconds: PHASE_SECONDS[phase] - elapsed, label: label });
        switch (state.phase) {
            case 'waiting':
                return timed('waiting', 'engine startup');
            case 'engines':
                return timed('engines', 'taxi out');
            case 'taxi-out':
                return timed('taxi-out', 'takeoff roll');
            case 'takeoff':
                return { seconds: (ROTATE_KT - state.speed) / TAKEOFF_ACCEL_KTS, label: 'liftoff' };
            case 'airborne':
                return { seconds: secondsToTouchdown(state), label: 'touchdown' };
            case 'rollout':
                return { seconds: (state.speed - TAXI_KT) / ROLLOUT_DECEL_KTS, label: 'taxi in' };
            case 'taxi-in':
                return timed('taxi-in', 'stop');
            case 'stopped':
                return timed('stopped', 'engine shutdown');
            default:
                return null;
        }
    }

    // Slowing down from speed v to the approach speed: how long it takes and how far it flies meanwhile.
    function decelSeconds(v) {
        return Math.max(0, (v - APPROACH_KT) / AIR_ACCEL_KTS);
    }

    function decelNm(v) {
        return (v + APPROACH_KT) / 2 * decelSeconds(v) / 3600;
    }

    // Time to slow down: what is left to touchdown is just enough to reach the approach speed and then fly the last APPROACH_STABLE_NM at it.
    function slowingDown(state, distToGo) {
        const toTouchdown = distToGo - TOUCHDOWN_BEFORE_NM;
        return toTouchdown <= decelNm(state.speed) + APPROACH_STABLE_NM;
    }

    // Airborne: the rest of the flight at the speeds it will fly - speeding up to the cruise speed, cruise, slowing down, the last nm at the approach speed.
    function secondsToTouchdown(state) {
        const distToGo = distanceNm(state.lat, state.lon, state.to.lat, state.to.lon);
        const toTouchdown = Math.max(0, distToGo - TOUCHDOWN_BEFORE_NM);
        if (slowingDown(state, distToGo)) {
            const rest = Math.max(0, toTouchdown - decelNm(state.speed));
            return decelSeconds(state.speed) + rest / APPROACH_KT * 3600;
        }
        const accelSeconds = Math.max(0, (CRUISE_KT - state.speed) / AIR_ACCEL_KTS);
        const accelNm = (state.speed + CRUISE_KT) / 2 * accelSeconds / 3600;
        const cruiseNm = Math.max(0, toTouchdown - accelNm - decelNm(CRUISE_KT) - APPROACH_STABLE_NM);
        return accelSeconds + cruiseNm / CRUISE_KT * 3600 + decelSeconds(CRUISE_KT) + APPROACH_STABLE_NM / APPROACH_KT * 3600;
    }

    // "0:33", "1:05:12"
    function formatSeconds(seconds) {
        const total = Math.max(0, Math.ceil(seconds));
        const h = Math.floor(total / 3600);
        const m = Math.floor(total / 60) % 60;
        const sec = total % 60;
        const pad = n => (n < 10 ? '0' : '') + n;
        return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
    }

    return {
        // The current state (null: nothing simulated yet).
        state: function () {
            return load();
        },

        active: function () {
            const state = load();
            return !!state && state.phase !== 'parked' && state.phase !== 'finished';
        },

        // The destination may be changed until the touchdown.
        canDivert: function () {
            const state = load();
            return !!state && DIVERT_PHASES.includes(state.phase);
        },

        // Starts a flight: the aircraft is put at "from", everything off; the engines start a minute later. from/to: { icao, lat, lon, elevation }.
        start: function (from, to) {
            const now = Date.now();
            const distance = distanceNm(from.lat, from.lon, to.lat, to.lon);
            const state = {
                from: from,
                to: to,
                diverts: 0,
                cruiseAlt: Math.max(3000, Math.min(45000, Math.round(distance / 5) * 1000)), // 200 ft per nm
                lat: from.lat,
                lon: from.lon,
                heading: bearingDeg(from.lat, from.lon, to.lat, to.lon),
                speed: 0,
                alt: from.elevation,
                onGround: 1,
                brake: 1,
                engines: 0,
                phase: 'waiting',
                phaseStart: now,
                updatedAt: now
            };
            save(state);
            return state;
        },

        // A new destination from where the aircraft is now; false when it is too late (it has touched down).
        // The level of the cruise stays: the flight may be held in the air as long as wanted.
        divert: function (airport) {
            const state = load();
            if (!state || !DIVERT_PHASES.includes(state.phase)) {
                return false;
            }
            state.to = airport;
            state.diverts = (state.diverts || 0) + 1;
            state.heading = bearingDeg(state.lat, state.lon, airport.lat, airport.lon);
            save(state);
            return true;
        },

        // Idle (no flight on): the aircraft stands, engines off, parking brake set, at this airport. airport: { icao, lat, lon, elevation }.
        // The heading is kept when it is already parked there.
        parkAt: function (airport) {
            const now = Date.now();
            const old = load();
            const state = {
                from: airport,
                to: airport,
                diverts: 0,
                cruiseAlt: 0,
                lat: airport.lat,
                lon: airport.lon,
                heading: old && typeof old.heading === "number" ? old.heading : 0,
                speed: 0,
                alt: airport.elevation,
                onGround: 1,
                brake: 1,
                engines: 0,
                phase: "parked",
                phaseStart: now,
                updatedAt: now
            };
            save(state);
            return state;
        },

        // The airport the idle aircraft stands at (after a finished flight: the destination), or null when there is no state or a flight is on.
        idleIcao: function () {
            const state = load();
            if (!state || this.active()) {
                return null;
            }
            return state.phase === "finished" ? state.to.icao : state.from.icao;
        },

        // Forgets the flight.
        reset: function () {
            save(null);
        },

        // Moves the simulation on to "now" (catching up after a reload).
        update: function (now) {
            const state = load();
            if (!state) {
                return null;
            }
            while (state.updatedAt < now) {
                const dt = Math.min(1, (now - state.updatedAt) / 1000);
                state.updatedAt += dt * 1000;
                step(state, dt);
            }
            save(state);
            return state;
        },

        // The posrep of the state, the same fields as the posrep of the FlightBag: time,E0,onGround,lat,lon,heading,tas,altitude,parkingBrake,enginesRunning
        posrep: function (state) {
            const scale6 = value => Math.round(value * 1e6) / 1e6;
            return [
                new Date().toISOString(), 'E0', state.onGround, scale6(state.lat), scale6(state.lon), Math.round(state.heading),
                Math.round(state.speed), Math.round(state.alt), state.brake, state.engines * 2
            ].join(',');
        },

        // One line: "Airborne WSSS-WMKK | 12:41 till touchdown | 480 kt | 32000 ft | HDG 301 | 84.0 nm to WMKK | ENG on | P/B off"
        describe: function (state) {
            if (!state) {
                return "Nothing is simulated yet";
            }
            if (state.phase === "parked") {
                return `Parked at ${state.from.icao} | engines off | parking brake set`;
            }
            const toGo = distanceNm(state.lat, state.lon, state.to.lat, state.to.lon);
            const next = nextStep(state);
            return [
                `${LABELS[state.phase] || state.phase} ${state.from.icao}-${state.to.icao}`,
                state.diverts ? `diverts: ${state.diverts}` : null,
                next ? `${formatSeconds(next.seconds)} till ${next.label}` : null,
                `${Math.round(state.speed)} kt`,
                `${Math.round(state.alt)} ft`,
                `HDG ${Math.round(state.heading)}`,
                `${toGo.toFixed(1)} nm to ${state.to.icao}`,
                `ENG ${state.engines ? 'on' : 'off'}`,
                `P/B ${state.brake ? 'set' : 'off'}`
            ].filter(part => part !== null).join(' | ');
        }
    };
})();
