
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

function loadAirportInfoIfNeeded(icao, callback) {
    if (!icao) {
        return;
    }
    const existingInfo = loadedAirportInfos[icao];
    if (existingInfo) {
        if (callback && !existingInfo.invalid && !existingInfo.loading) {
            callback();
        }
        return;
    }

    loadedAirportInfos[icao] = { loading: true };

    $.ajax({
        url: distanceUrl + '/v1/airport/info?icao=$icao$'.replace('$icao$', icao.toUpperCase()),
        method: 'GET',
        dataType: 'json',
        success: function (response) {
            loadedAirportInfos[icao] = response;
            if (callback) {
                callback(response);
            }
        },
        error: function (e) {
            console.error("error loading airport info by '" + icao + "'");
            loadedAirportInfos[icao] = { invalid: true };
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
