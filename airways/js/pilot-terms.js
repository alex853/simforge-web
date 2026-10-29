// What the pilot gets on a type of aircraft, the explanation behind the tiles "Hourly rate" and "Income share" (the buttons Details on busy-birds.html and on
// shadow-jet.html). The answer of the server is the same for both operators (GET /busy-birds/pilot-terms, GET /shadow-jet/pilot-terms): the base hourly rate of the
// type, the base share of the experience level, the deductions with their percents and the coefficients. The rates (what is taken off, the shares, the least
// coefficient) are the affair of the operator and come from the server, the page of the qualifications shows only whether the criteria are met.
// The scripts need esc() and moneyHtml() (js/details.js, js/requests.js).

// 0, I, II, III, IV, V
function roman(level) {
    return ['0', 'I', 'II', 'III', 'IV', 'V'][level] ?? String(level);
}

// 375 -> '375', 0.375 -> '0.375', 12.5 -> '12.5': no more than 3 decimals, no trailing zeros
function formatNumber(n) {
    return String(Math.round(n * 1000) / 1000);
}

const DEDUCTION_TEXT = {
    NoTypeCurrency: 'No type currency',
    NoNightCurrency: 'No night currency',
    CannotCarryPassengers: 'Cannot carry passengers',
    Manual: 'Manual flight'
};

// the lines of the deductions, or a line that there are none
function deductionLines(deductions) {
    if (!deductions.length) {
        return '<div class="terms-line text-secondary"><span>No deductions</span><span>0%</span></div>';
    }
    return deductions.map(function (d) {
        return '<div class="terms-line"><span>' + esc(DEDUCTION_TEXT[d.code] ?? d.code) + '</span><span class="text-danger">&minus;' + d.percent + '%</span></div>';
    }).join('');
}

// the pay is never less than the least coefficient of the base: say it when the deductions have gone below that
function floorNote(deductions, coefficient) {
    const total = deductions.reduce(function (sum, d) { return sum + d.percent; }, 0);
    return total > 100 - coefficient
        ? '<div class="text-secondary small">The deductions are more than ' + (100 - coefficient) + '%, the pay is not less than ' + coefficient + '% of the base.</div>' : '';
}

// the explanation of the hourly rate: the base rate of the type, the deductions, the result
function hourlyDetailsHtml(t) {
    return '<div class="terms-line"><span>Base hourly rate, ' + esc(t.aircraftType) + '</span><span class="fw-semibold">' + moneyHtml(t.hourlyRate) + '</span></div>' +
        deductionLines(t.flightPayDeductions) +
        floorNote(t.flightPayDeductions, t.flightPayCoefficientPercent) +
        '<div class="terms-line terms-result"><span>Your hourly rate: ' + moneyHtml(t.hourlyRate) + ' &times; ' + t.flightPayCoefficientPercent + '%</span>' +
        '<span class="fw-semibold">' + moneyHtml(t.effectiveHourlyRate) + '</span></div>';
}

// the explanation of the income share: the base share of the experience level, the deductions, the result
function shareDetailsHtml(t) {
    return '<div class="terms-line"><span>Base share, experience level ' + roman(t.experienceLevel) + '</span><span class="fw-semibold">' + formatNumber(t.incomeSharePercent) + '%</span></div>' +
        deductionLines(t.incomeShareDeductions) +
        floorNote(t.incomeShareDeductions, t.incomeShareCoefficientPercent) +
        '<div class="terms-line terms-result"><span>Your income share: ' + formatNumber(t.incomeSharePercent) + '% &times; ' + t.incomeShareCoefficientPercent + '%</span>' +
        '<span class="fw-semibold">' + formatNumber(t.effectiveIncomeSharePercent) + '%</span></div>';
}
