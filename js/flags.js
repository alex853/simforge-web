// Country flags (FatCow icons) shared by simforge-web pages.
//
// The country is a name, as the airports service and airways return it ("United Kingdom", "Bahamas, The"). Airways has the proper English names (see
// docs/city-airport-playbook.md in airways); the airports service has names of its own, so the old ones stay here.
// The icons are resolved relatively to this file, so the page can be at any depth: <site>/js/flags.js -> <site>/fatcow/...

const SIMFORGE_FATCOW_URL = new URL('../fatcow/', document.currentScript.src).href;

// names which differ from the FatCow file name 'flag_<lower_case_name_with_underscores>.png'
const SIMFORGE_FLAG_NAMES = {
    "Ascension Island": "saint_helena",
    "Cote d'Ivoire": "cote_divoire",
    "Bahamas, The": "bahamas",
    "Bosnia and Herzegovina": "bosnia",
    "Congo": "congo_republic",
    "Democratic Republic of the Congo": "congo_democratic_republic",
    "Congo (DRC)": "congo_democratic_republic",
    "Guinea-Bissau": "guinea_bissau",
    "Myanmar": "burma",
    "North Macedonia": "macedonia",
    "Saint Vincent and the Grenadines": "saint_vincent_and_grenadines",
    "British Virgin Islands": "virgin_islands",
    "Timor-Leste": "east_timor",
    "Fiji Islands": "fiji",
    "Gambia, The": "gambia",
    "Maldives": "maledives",
    "Netherlands, The": "netherlands",
    "Rumania": "romania",
    "Serbia and Montenegro": "serbia_montenegro",
    "United Kingdom": "great_britain",
    "United States": "usa"
};

// grey - the grey set of icons, size - 16 or 32 (the grey set is 16 only)
function getCountryFlagUrl(country, grey, size) {
    const flagName = SIMFORGE_FLAG_NAMES[country] ?? country.toLowerCase().replaceAll(' ', '_');
    const folder = grey ? 'FatCow_Icons16x16_Grey' : `FatCow_Icons${size ?? 16}x${size ?? 16}`;
    return `${SIMFORGE_FATCOW_URL}${folder}/flag_${flagName}.png`;
}
