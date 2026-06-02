
const airwaysServiceUrl = 'https://d1.simforge.net:7776';

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
    return _airwaysAuth('user', method, url, data, callback, errorCallback);
}

function airwaysAuthAdmin(method, url, data, callback, errorCallback) {
    return _airwaysAuth('admin', method, url, data, callback, errorCallback);
}

function _airwaysAuth(authType, method, url, data, callback, errorCallback) {
    if (!(method === 'GET' || method === 'POST' || method === 'PUT')) {
        throw new Error(`unsupported method ${method}`);
    }
    $.ajax({
        method: method,
        url: airwaysServiceUrl + url,
        headers: _airwaysAuthHeaders(authType),
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

function _airwaysAuthHeaders(authType) {
    const token = _airwaysToken(authType);
    if (token && token.trim().length > 0) {
        return { 'Authorization': 'Bearer ' + token.trim() };
    }
    return {};
}

function _airwaysToken(authType) {
    try {
        return localStorage.getItem(authType === 'admin' ? 'airways.admin.token' : 'airways.token');
    } catch (e) {
        return null;
    }
}
