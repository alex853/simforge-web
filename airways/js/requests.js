
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

// The pages which need the token of the user (authType 'user') send the user to login.html when there is no token in this browser, or when the server
// does not accept it. login.html takes the token, checks it and sends the user back to the page he came from (?return=).
function redirectToLogin() {
    const here = location.pathname + location.search + location.hash;
    location.replace('login.html?return=' + encodeURIComponent(here));
}

function _airwaysAuth(authType, method, url, data, callback, errorCallback) {
    if (!(method === 'GET' || method === 'POST' || method === 'PUT')) {
        throw new Error(`unsupported method ${method}`);
    }
    if (authType === 'user' && !_airwaysAuthHeaders(authType).Authorization) {
        redirectToLogin();
        return;
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
            if (authType === 'user' && e && e.status === 401) {
                redirectToLogin(); // the token of this browser is not accepted: type it again
                return;
            }
            if (errorCallback) {
                errorCallback(e);
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

// The money of the game: a small lowercase v with the strike-through style (virtual money, .cur-v in css/details.css) before the number. The number has
// the separators of thousands, a minus goes before the symbol. There is no picture and no special font.
function moneySymbolHtml() {
    return '<span class="cur-v" title="Virtual money">v</span>';
}

function moneyHtml(amount) {
    if (amount === null || amount === undefined || amount === '') {
        return '\u2014';
    }
    const number = Number(amount);
    if (Number.isNaN(number)) {
        return '\u2014';
    }
    return (number < 0 ? '\u2212' : '') + moneySymbolHtml() + Math.abs(number).toLocaleString('en-US');
}
