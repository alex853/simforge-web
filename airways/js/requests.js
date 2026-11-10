
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
//
// The most used items: every click on an item of the menu (or on one of these shortcuts) is counted in the browser (localStorage, the key SITE_MENU_USAGE_KEY, the number of
// clicks of every item; nothing is sent anywhere). The three items which are clicked most often (not the page which is open) stand in the bar as links (plain text, like the items of the menu) at the left of the
// menu button, the most used one is the first. The room decides how many of them are shown: a link which does not fit (the width of the bar is measured) is hidden with
// all the less used ones after it, so on a narrow screen there is one button or none. An item with no clicks is never shown.
const SITE_MENU_ITEMS = [
    {key: 'map', label: 'Map', short: 'Map', href: 'index.html'},
    {divider: true},
    {key: 'pilot', label: 'Pilot', short: 'Pilot', href: 'pilot.html'},
    {key: 'pilot-roster', label: 'Roster', short: 'Roster', href: 'pilot-roster.html'},
    {key: 'qualifications', label: 'Qualifications', short: 'Qualifications', href: 'pilot-qualifications.html'},
    {key: 'logbook', label: 'Logbook', short: 'Logbook', href: 'pilot-logbook.html'},
    {divider: true},
    {key: 'flight-dashboard', label: 'Flight dashboard', short: 'Dashboard', href: 'flight-dashboard.html'},
    {key: 'shadow-jet', label: 'Book ShadowJet flight', short: 'ShadowJet', href: 'shadow-jet.html'},
    {key: 'busy-birds', label: 'Book busyBirds flight', short: 'busyBirds', href: 'busy-birds.html'}
];

const SITE_MENU_USAGE_KEY = 'airways.menuUsage';
const SITE_MENU_QUICK_MAX = 3;

// the clicks of the items by their keys; the browser storage can be empty, blocked or broken: then there is no statistics, the menu works without it
function siteMenuUsage() {
    try {
        const usage = JSON.parse(localStorage.getItem(SITE_MENU_USAGE_KEY) || '{}');
        return usage && typeof usage === 'object' ? usage : {};
    } catch (e) {
        return {};
    }
}

function siteMenuCountClick(key) {
    try {
        const usage = siteMenuUsage();
        usage[key] = (Number(usage[key]) || 0) + 1;
        localStorage.setItem(SITE_MENU_USAGE_KEY, JSON.stringify(usage));
    } catch (e) {
        // no statistics
    }
}

// up to SITE_MENU_QUICK_MAX items with clicks, the most clicked first (the same number: in the order of the menu), without the page which is open
function siteMenuQuickItems(current) {
    const usage = siteMenuUsage();
    return SITE_MENU_ITEMS
        .filter(function (item) { return !item.divider && item.key !== current && Number(usage[item.key]) > 0; })
        .map(function (item, order) { return {item: item, count: Number(usage[item.key]), order: order}; })
        .sort(function (a, b) { return b.count - a.count || a.order - b.order; })
        .slice(0, SITE_MENU_QUICK_MAX)
        .map(function (entry) { return entry.item; });
}

// the items of the list, the page which is open is marked
function siteMenuItemsHtml(current) {
    return SITE_MENU_ITEMS.map(function (item) {
        if (item.divider) {
            return '<li><hr class="dropdown-divider"></li>';
        }
        const active = item.key === current;
        return '<li><a class="dropdown-item' + (active ? ' active' : '') + '" href="' + item.href + '" data-menu-key="' + item.key + '"' + (active ? ' aria-current="page"' : '') + '>' + item.label + '</a></li>';
    }).join('');
}

function siteMenuQuickHtml(current) {
    return siteMenuQuickItems(current).map(function (item) {
        return '<a class="site-menu-quick-link" href="' + item.href + '" data-menu-key="' + item.key + '" title="' + item.label + '">' + item.short + '</a>';
    }).join('');
}

function siteMenuMargins(element) {
    const style = getComputedStyle(element);
    return (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0);
}

// Shows as many shortcuts as the bar has room for: the room is the width of the bar without its padding, the brand and the button of the menu. The shortcuts are taken in
// their order and the first one which does not fit stops it (the less used ones are not shown instead of it).
function siteMenuFit(bar) {
    const quick = bar.querySelector('.site-menu-quick');
    const links = quick ? Array.from(quick.children) : [];
    if (!links.length) {
        return;
    }
    links.forEach(function (link) { link.style.display = ''; });  // all of them are visible while they are measured

    const style = getComputedStyle(bar);
    const brand = bar.querySelector('.navbar-brand');
    const menu = bar.querySelector('.site-menu');
    // the links have their own padding, the gap of the container is zero (it is read in case it is set)
    const gap = parseFloat(getComputedStyle(quick).columnGap) || 0;
    let free = bar.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0)
        - (brand ? brand.offsetWidth + siteMenuMargins(brand) : 0)
        - (menu ? menu.offsetWidth + siteMenuMargins(menu) : 0)
        - 8;  // a little air between the brand and the first shortcut
    let shown = 0;
    for (const link of links) {
        const need = link.offsetWidth + siteMenuMargins(link) + (shown ? gap : 0);
        if (need > free) {
            break;
        }
        free -= need;
        shown++;
    }
    links.forEach(function (link, i) { link.style.display = i < shown ? '' : 'none'; });
}

// the clicks of the items are counted before the page goes away
function siteMenuWatchClicks(root) {
    root.addEventListener('click', function (event) {
        const target = event.target.closest ? event.target.closest('[data-menu-key]') : null;
        if (target) {
            siteMenuCountClick(target.getAttribute('data-menu-key'));
        }
    });
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
    // the map has no room for the shortcuts, but its clicks are counted
    siteMenuWatchClicks(document.querySelector('.site-menu-tab'));
}

function initSiteMenu(current) {
    const bar = document.querySelector('nav.navbar > .container-lg') || document.querySelector('nav.navbar > .container');
    if (!bar || bar.querySelector('.site-menu')) {
        return;
    }
    const items = siteMenuItemsHtml(current);
    bar.insertAdjacentHTML('beforeend', '<div class="site-menu-quick ms-auto d-flex align-items-center">' + siteMenuQuickHtml(current) + '</div>'
        + '<div class="dropdown site-menu ms-2">'
        + '<button type="button" class="btn btn-outline-secondary site-menu-button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Menu">'
        + '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg></button>'
        + '<ul class="dropdown-menu dropdown-menu-end site-menu-list">' + items + '</ul></div>');

    siteMenuWatchClicks(bar);
    siteMenuFit(bar);
    // the room changes with the window, and the fonts of the page can change the widths after the first measure
    window.addEventListener('resize', function () { siteMenuFit(bar); });
    window.addEventListener('load', function () { siteMenuFit(bar); });
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { siteMenuFit(bar); });
    }
}
