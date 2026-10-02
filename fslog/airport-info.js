
const airportServiceUrl = 'https://d1.simforge.net:7771';
const loadedAirportInfos = {};


function loadAndShowAirportInfo(icao) {
    if (icao) {
        setTimeout(function () {
            loadAirportInfoIfNeeded(icao, function () {
                $('.' + icao).html(airportInfo_flagIcaoName(icao));
                $('.' + icao + '-grey').html(airportInfo_flagGreyIcaoName(icao));
            });
        }, 10);
    }
}

// Callback is called only when the info is loaded successfully
function loadAirportInfoIfNeeded(icao, callback) {
    loadAirportInfo(icao, function (info) {
        if (info && callback) {
            callback(info);
        }
    });
}

// Callback is always called: with the info, or with null when the airport cannot be loaded.
// Every ICAO is requested once; callers arriving while the request is in flight are queued.
function loadAirportInfo(icao, callback) {
    if (!icao) {
        return;
    }
    const existingInfo = loadedAirportInfos[icao];
    if (existingInfo) {
        if (existingInfo.loading) {
            if (callback) {
                existingInfo.callbacks.push(callback);
            }
        } else if (callback) {
            callback(existingInfo.invalid ? null : existingInfo);
        }
        return;
    }

    const loadingInfo = { loading: true, callbacks: callback ? [callback] : [] };
    loadedAirportInfos[icao] = loadingInfo;

    function finish(info) {
        loadedAirportInfos[icao] = info || { invalid: true };
        loadingInfo.callbacks.forEach(function (cb) {
            cb(info);
        });
    }

    $.ajax({
        url: airportServiceUrl + '/v1/airport/info?icao=$icao$'.replace('$icao$', icao.toUpperCase()),
        method: 'GET',
        dataType: 'json',
        success: function (response) {
            finish(response);
        },
        error: function (e) {
            console.error("error loading airport info by '" + icao + "'");
            finish(null);
        }
    });
}

function getCountryFlagUrl(country, grey) {
    const baseUrl = !grey
        ? "../fatcow/FatCow_Icons16x16/flag_$s$.png"
        : "../fatcow/FatCow_Icons16x16_Grey/flag_$s$.png";

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

    return baseUrl.replace("$s$", flagName);
}

function getAirportCityName(info) {
    const name = info.name;
    const city = info.city;
    let shownName = name;

    if (!name.includes(city)) {
        shownName = name + ", " + city;
    }
    return shownName;
}

function airportInfo_flagName(icao) {
    const info = loadedAirportInfos[icao];
    if (!info || info.loading || info.invalid) {
        return null;
    }
    const url = getCountryFlagUrl(info.country);
    let shownName = getAirportCityName(info);
    return '<img src="' + url + '" style="vertical-align: text-top;"> ' + shownName;
}

function airportInfo_flagNameLimited(icao, maxLen) {
    const info = loadedAirportInfos[icao];
    if (!info || info.loading || info.invalid) {
        return null;
    }
    const url = getCountryFlagUrl(info.country);
    let shownName = getAirportCityName(info);
    while (shownName.length > maxLen) {
        const index = shownName.lastIndexOf(' ');
        if (index === -1) {
            break;
        }
        shownName = shownName.substring(0, index) + '...';
    }
    return '<img src="' + url + '" style="vertical-align: text-top;"> ' + shownName;
}

function airportInfo_flagIcaoName(icao) {
    const info = loadedAirportInfos[icao];
    if (!info || info.loading || info.invalid) {
        return null;
    }
    const url = getCountryFlagUrl(info.country);
    let shownName = getAirportCityName(info);
    return '<img src="' + url + '" style="vertical-align: text-top;"> <b>' + icao + '</b> ' + shownName;
}

function airportInfo_flagGreyIcaoName(icao) {
    const info = loadedAirportInfos[icao];
    if (!info || info.loading || info.invalid) {
        return null;
    }
    const url = getCountryFlagUrl(info.country, true);
    let shownName = getAirportCityName(info);
    return '<img src="' + url + '" style="vertical-align: text-top;"> <b>' + icao + '</b> ' + shownName;
}



const loadedAirportDistances = {};

function airportDistanceTimer() {
    // editorRow exists only on pages with the row editor (index.html)
    if (typeof editorRow === 'undefined'
        || !editorRow
        || !editorRow.fields
        || !editorRow.fields.departure
        || !editorRow.fields.destination
        || !editorRow.fields.distance) {
        return;
    }

    const from = nonEmptyUpperCase(editorRow.fields.departure.val());
    const to = nonEmptyUpperCase(editorRow.fields.destination.val());

    if (from === undefined || to === undefined) {
        return;
    }

    const key = from + '-' + to;
    const dist = loadedAirportDistances[key];

    if (dist === undefined) {
        loadAirportDistance(from, to);
    } else if (Number.isFinite(dist)) {
        const currentDist = editorRow.fields.distance.val();
        if (currentDist === undefined
            || currentDist === ""
            || parseInt(currentDist) < dist
            || parseInt(currentDist) === editorRow.fields.distance.previouslyLoadedDistance) {
            editorRow.fields.distance.val(dist);
            editorRow.fields.distance.previouslyLoadedDistance = dist;
        }
    }
}

setInterval(airportDistanceTimer, 100);

function loadAirportDistance(from, to) {
    const key = from + '-' + to;

    $.ajax({
        url: airportServiceUrl + '/v1/distance?from=$from$&to=$to$'.replace('$from$', from.toUpperCase()).replace('$to$', to.toUpperCase()),
        method: 'GET',
        success: function (response) {
            loadedAirportDistances[key] = parseInt(response);
        },
        error: function () {
            loadedAirportDistances[key] = 'error';
        }
    });
}
