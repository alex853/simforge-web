
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

// The menu of the top bar: a Bootstrap dropdown with a button of three lines at the right edge of the bar (the bar has the container of the page, so the
// button is aligned with the right edge of the tiles), a list of the pages under it. The page which is open is marked. The page needs the scripts of Bootstrap
// (the dropdown opens and closes by itself) and calls initSiteMenu('<its key>') when it is loaded.
const SITE_MENU_ITEMS = [
    {key: 'map', label: 'Map', href: 'index.html'},
    {divider: true},
    {key: 'pilot', label: 'Pilot', href: 'pilot.html'},
    {key: 'qualifications', label: 'Qualifications', href: 'pilot-qualifications.html'},
    {key: 'logbook', label: 'Logbook', href: 'pilot-logbook.html'},
    {divider: true},
    {key: 'flight-dashboard', label: 'Flight dashboard', href: 'flight-dashboard.html'},
    {key: 'busy-birds', label: 'Busy Birds', href: 'busy-birds.html'}
];

// the items of the list, the page which is open is marked
function siteMenuItemsHtml(current) {
    return SITE_MENU_ITEMS.map(function (item) {
        if (item.divider) {
            return '<li><hr class="dropdown-divider"></li>';
        }
        const active = item.key === current;
        return '<li><a class="dropdown-item' + (active ? ' active' : '') + '" href="' + item.href + '"' + (active ? ' aria-current="page"' : '') + '>' + item.label + '</a></li>';
    }).join('');
}

// The map has no top bar (it fills the whole window), so the menu is a small tab with the letters "MENU" which hangs from the top edge at the right: the same list
// under it. The page needs the scripts of Bootstrap and calls initSiteMenuTab('<its key>') when it is loaded.
function initSiteMenuTab(current) {
    if (document.querySelector('.site-menu-tab')) {
        return;
    }
    const style = document.createElement('style');
    style.textContent = '.site-menu-tab { position: fixed; top: 0; right: 16px; z-index: 1100; }'
        + '.site-menu-tab-button { display: block; padding: 3px 14px 4px; font: 600 11px/1.2 Helvetica, Arial, sans-serif; letter-spacing: .14em; color: #a8a8ff;'
        + ' background: rgba(24, 24, 32, .82); border: 1px solid rgba(168, 168, 255, .35); border-top: 0; border-radius: 0 0 9px 9px; cursor: pointer; }'
        + '.site-menu-tab-button:hover, .site-menu-tab-button[aria-expanded="true"] { background: rgba(48, 48, 72, .95); color: #fff; }'
        + '.site-menu-tab .dropdown-menu { margin-top: 2px; }';
    document.head.appendChild(style);
    document.body.insertAdjacentHTML('beforeend', '<div class="dropdown site-menu-tab" data-bs-theme="dark">'
        + '<button type="button" class="site-menu-tab-button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Menu">MENU</button>'
        + '<ul class="dropdown-menu dropdown-menu-end">' + siteMenuItemsHtml(current) + '</ul></div>');
}

function initSiteMenu(current) {
    const bar = document.querySelector('nav.navbar > .container-lg') || document.querySelector('nav.navbar > .container');
    if (!bar || bar.querySelector('.site-menu')) {
        return;
    }
    const items = siteMenuItemsHtml(current);
    bar.insertAdjacentHTML('beforeend', '<div class="dropdown site-menu ms-auto">'
        + '<button type="button" class="btn btn-outline-secondary site-menu-button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Menu">'
        + '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg></button>'
        + '<ul class="dropdown-menu dropdown-menu-end site-menu-list">' + items + '</ul></div>');
}
