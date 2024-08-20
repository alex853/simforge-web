
const StatsModel= {
    Filter: {
        FlightsOnly: function (each) {
            return RecordType.isFlight(each.Type);
        }
    },

    Dimension: {
        AircraftType: function (each) {
            return each.Flight.AircraftType;
        },
        AircraftRegistration: function (each) {
            return each.Flight.AircraftRegistration || 'UNKNOWN';
        },
        Year: function (each) {
            return each.Date.substring(0, 4);
        },
        YearMonth: function (each) {
            return each.Date.substring(0, 7);
        },
        DepartureIcao: function (each) {
            return each.Flight.Departure;
        },
        DepartureIcaoRegion: function (each) {
            return each.Flight.Departure.substring(0, 1) + 'xxx';
        },
        DepartureIcaoSubregion: function (each) {
            return each.Flight.Departure.substring(0, 2) + 'xx';
        }
    },

    Metric: {
        Count: function () {
            return 1;
        },

        TotalTime: function (each) {
            const parsed = parseHHMM(each.Flight.TotalTime);
            return parsed ? parsed.total / 60 : 0;
        }
    }
}

function calcStats(records, filter, dimension, metric) {
    const result = {};

    records.forEach(function (each) {
        if (filter && !filter(each)) {
            return;
        }

        const category = dimension(each);
        const value = metric(each);

        result[category] = (result[category] || 0) + value;
    });

    return result;
}

function statsOpenModal() {
    statsRedraw();

    $('#chartsModal').modal();
}

let statsShownChart;

function statsRedraw() {
    const selectedMetric = $( "#chartsMetric option:selected" ).val();
    const selectedBreakBy = $( "#chartsBreakBy option:selected" ).val();
    const selectedThenBreakBy = $( "#chartsThenBreakBy option:selected" ).val();
    const selectedShow = $( "#chartsShow option:selected" ).val();
    const selectedYear = $( "#chartsYears option:selected" ).val();

    let dimension = StatsModel.Dimension.AircraftType;
    switch (selectedBreakBy) {
        case 'by-type':
            dimension = StatsModel.Dimension.AircraftType;
            break;
        case 'by-tail':
            dimension = StatsModel.Dimension.AircraftRegistration;
            break;
        case 'by-year':
            dimension = StatsModel.Dimension.Year;
            break;
        case 'by-year-month':
            dimension = StatsModel.Dimension.YearMonth;
            break;
        case 'by-departure-icao':
            dimension = StatsModel.Dimension.DepartureIcao;
            break;
        case 'by-departure-icao-region':
            dimension = StatsModel.Dimension.DepartureIcaoRegion;
            break;
        case 'by-departure-icao-subregion':
            dimension = StatsModel.Dimension.DepartureIcaoSubregion;
            break;
    }

    let filter;
    if (selectedYear === 'show-all') {
        filter = StatsModel.Filter.FlightsOnly;
    } else {
        filter = function (each) {
            return StatsModel.Filter.FlightsOnly(each)
                && each.Date.startsWith(selectedYear);
        }
    }

    const stats = [];
    if (selectedMetric === 'flights-hours') {
        stats.push(calcFlightsStats(filter, dimension));
        stats.push(calcHoursStats(filter, dimension))
    } else if (selectedMetric === 'flights') {
        stats.push(calcFlightsStats(filter, dimension));
    } else if (selectedMetric === 'hours') {
        stats.push(calcHoursStats(filter, dimension));
    }

    const rawData = [];
    Object.keys(stats[0].data).forEach(function (category) {
        const dataEntry = {
            category: category
        };
        stats.forEach(function (eachStats, index) {
            dataEntry['value' + index] = eachStats.data[category];
        });
        rawData.push(dataEntry);
    });

    let data = [];
    switch (selectedShow) {
        case 'all-by-name':
            rawData.sort(function (a, b) { return a.category.localeCompare(b.category); });
            data = rawData;
            break;
        case 'all-by-value-desc':
            rawData.sort(function (a, b) { return b.value0 - a.value0; });
            data = rawData;
            break;
        case 'top-10':
            rawData.sort(function (a, b) { return b.value0 - a.value0; });
            data = rawData.slice(0, Math.min(10, rawData.length));
            break;
    }

    if (statsShownChart) {
        statsShownChart.destroy();
    }

    const datasets = [];
    stats.forEach(function (eachStats, index) {
        datasets.push({
            label: eachStats.label,
            data: data.map(row => row['value' + index])
        });
    });

    statsShownChart = new Chart(
        document.getElementById('chartCanvas'),
        {
            type: selectedShow !== 'top-10' ? 'bar' : 'doughnut',
            options: {
                plugins: {
                    legend: {
                        position: selectedShow !== 'top-10' ? 'top' : 'right'
                    }
                }
            },
            data: {
                labels: data.map(row => row.category),
                datasets: datasets
            }
        }
    );

}



function calcFlightsStats(filter, dimension) {
    return {
        label: "Flights",
        data: calcStats(records,
            filter,
            dimension,
            StatsModel.Metric.Count)
    };
}

function calcHoursStats(filter, dimension) {
    return {
        label: "Hours",
        data: calcStats(records,
            filter,
            dimension,
            StatsModel.Metric.TotalTime)
    };
}

