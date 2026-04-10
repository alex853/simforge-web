
const airwaysServiceUrl = 'https://d1.simforge.net:7776';

function loadCities(callback) {
    $.ajax({
        url: airwaysServiceUrl + '/geo/cities',
        method: 'GET',
        dataType: 'json',
        success: function (response) {
            if (callback) {
                callback(response);
            }
        },
        error: function (e) {
            console.error("error loading city data");
        }
    });
}

function loadAirports(callback) {
    $.ajax({
        url: airwaysServiceUrl + '/geo/airports',
        method: 'GET',
        dataType: 'json',
        success: function (response) {
            if (callback) {
                callback(response);
            }
        },
        error: function (e) {
            console.error("error loading airports data");
        }
    });
}

function loadAllAircraft(callback) {
    $.ajax({
        url: airwaysServiceUrl + '/aircraft/all',
        method: 'GET',
        dataType: 'json',
        success: function (response) {
            if (callback) {
                callback(response);
            }
        },
        error: function (e) {
            console.error("error loading aircraft data");
        }
    });
}

function loadFlyingAircraft(callback) {
    $.ajax({
        url: airwaysServiceUrl + '/aircraft/flying',
        method: 'GET',
        dataType: 'json',
        success: function (response) {
            if (callback) {
                callback(response);
            }
        },
        error: function (e) {
            console.error("error loading aircraft data");
        }
    });
}

function loadAllEventsToProcess(callback) {
    $.ajax({
        url: airwaysServiceUrl + '/events-to-process/all',
        method: 'GET',
        dataType: 'json',
        success: function (response) {
            if (callback) {
                callback(response);
            }
        },
        error: function (e) {
            console.error("error loading events data");
        }
    });
}

function loadAllFlightMissions(callback) {
    $.ajax({
        url: airwaysServiceUrl + '/flight-mission/all',
        method: 'GET',
        dataType: 'json',
        success: function (response) {
            if (callback) {
                callback(response);
            }
        },
        error: function (e) {
            console.error("error loading flight mission data");
        }
    });
}

function loadAllEventLogs(callback) {
    $.ajax({
        url: airwaysServiceUrl + '/event-log/all',
        method: 'GET',
        dataType: 'json',
        success: function (response) {
            if (callback) {
                callback(response);
            }
        },
        error: function (e) {
            console.error("error loading event log");
        }
    });
}

function airwaysGet(url, callback, errorCallback) {
    $.ajax({
        url: airwaysServiceUrl + url,
        method: 'GET',
        dataType: 'json',
        success: function (response) {
            if (callback) {
                callback(response);
            }
        },
        error: function (e) {
            console.error("error loading " + url + " data");
            if (errorCallback) {
                errorCallback();
            }
        }
    });
}

function airwaysGetPlain(url, callback, errorCallback) {
    $.ajax({
        url: airwaysServiceUrl + url,
        method: 'GET',
        success: function (response) {
            if (callback) {
                callback(response);
            }
        },
        error: function (e) {
            console.error("error loading " + url + " data");
            if (errorCallback) {
                errorCallback();
            }
        }
    });
}

function airwaysAuth(method, url, data, callback, errorCallback) {
    if (!(method === 'GET' || method === 'POST' || method === 'PUT')) {
        throw new Error(`unsupported method ${method}`);
    }
    $.ajax({
        method: method,
        url: airwaysServiceUrl + url,
        headers: airwaysAuthHeaders(),
        data: data,
        dataType: 'json',
        success: function (response) {
            if (callback) {
                callback(response);
            }
        },
        error: function (e) {
            console.error("error loading " + url + " data");
            if (errorCallback) {
                errorCallback();
            }
        }
    });
}

function airwaysToken() {
    try {
        return localStorage.getItem('airways.token');
    } catch (e) {
        return null;
    }
}

function airwaysAuthHeaders() {
    const token = airwaysToken();
    if (token && token.trim().length > 0) {
        return { 'Authorization': 'Bearer ' + token.trim() };
    }
    return {};
}

