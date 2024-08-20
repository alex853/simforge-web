var myUserId = "afe78778-39d3-494d-b366-e696e75b96a4";

function today() {
    return new Date().toISOString().split('T')[0];
}

function parseHHMM(timeStr) {
    if (timeStr === undefined) {
        return undefined;
    }
    var parts = timeStr.split(':');
    if (parts.length !== 2) {
        return undefined;
    }
    var hhStr = parts[0];
    var mmStr = parts[1];
    if (hhStr.length > 2 || mmStr.length !== 2) {
        return undefined;
    }
    var hh = parseInt(hhStr);
    var mm = parseInt(mmStr);
    if (!(0 <= hh && hh <= 23) || !(0 <= mm && mm <= 59)) {
        return undefined;
    }
    return { h: hh, m: mm, total: hh * 60 + mm };
}

function formatMinutesAsHMM(minutes) {
    var mm = minutes % 60;
    var h = (minutes - mm) / 60;
    return h + ':' + (mm < 10 ? '0' : '') + mm;
}

function formatMinutesAsHHMM(minutes) {
    var mm = minutes % 60;
    var hh = (minutes - mm) / 60;
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
}

function hoursDurationAsHMM(hours) {
    var minutes = Math.trunc(hours * 60);
    return formatMinutesAsHMM(minutes);
}

function nonEmpty(s) {
    if (!s) {
        return undefined;
    }
    if (s.trim().length === 0) {
        return undefined;
    }
    return s;
}

function nonEmptyInt(s) {
    if (!s) {
        return undefined;
    }
    if (s.trim().length === 0) {
        return undefined;
    }
    return parseInt(s);
}

function nonEmptyUpperCase(s) {
    if (!s) {
        return undefined;
    }
    if (s.trim().length === 0) {
        return undefined;
    }
    return s.toUpperCase();
}

function showAlert(message, type, closeDelay) {
    var $container = $("#alerts-container");

    if ($container.length === 0) {
        // alerts-container does not exist, create it
        $container = $('<div id="alerts-container">')
            .css({
                position: "fixed"
                ,width: "50%"
                ,left: "25%"
                ,top: "10%"
            })
            .appendTo($("body"));
    }

    // default to alert-info; other options include success, warning, danger
    type = type || "info";

    // create the alert div
    var alert = $('<div>')
        .addClass("fade in show alert alert-" + type)
        .append(
            $('<button type="button" class="close" data-dismiss="alert">')
                .append("&times;")
        )
        .append(message);

    // add the alert div to top of alerts-container, use append() to add to bottom
    $container.prepend(alert);

    // if closeDelay was passed - set a timeout to close the alert
    if (closeDelay)
        window.setTimeout(function() { alert.alert("close") }, closeDelay);
}

function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = (performance && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function disableField(field) {
    return field.prop('disabled', true).addClass('form-control-plaintext').removeClass('form-control');
}

function enableField(field) {
    return field.prop('disabled', false).addClass('form-control').removeClass('form-control-plaintext');
}

function hideButton(button) {
    return button.addClass('d-none');
}

function showButton(button) {
    return button.removeClass('d-none');
}

var RecordType = {
    isFlight: function (type) {
        return (type !== 'transfer') && (type !== 'discontinuity');
    },

    isTransfer: function (type) {
        return type === 'transfer';
    },

    isDiscontinuity: function (type) {
        return type === 'discontinuity';
    },

    isFlightOrTransfer: function (type) {
        return this.isFlight(type) || this.isTransfer(type);
    }
}

class Record {
    constructor(record) {
        this.record = record;
    }

    get date() {
        return this.record.Date;
    }

    get callsign() {
        if (this.isFlight()) {
            return this.record.Flight.Callsign;
        } else {
            throw new Error('Callsign is not available');
        }
    }

    get flightNumber() {
        if (this.isFlight()) {
            return this.record.Flight.FlightNumber;
        } else {
            throw new Error('FlightNumber is not available');
        }
    }

    get aircraftType() {
        if (this.isFlight()) {
            return this.record.Flight.AircraftType;
        } else {
            throw new Error('AircraftType is not available');
        }
    }

    get aircraftRegistration() {
        if (this.isFlight()) {
            return this.record.Flight.AircraftRegistration;
        } else {
            throw new Error('AircraftRegistration is not available');
        }
    }

    get range() {
        var from = new Date(this.record['BeginningDT']);
        var to;

        if (this.isFlight() || this.isTransfer()) {
            var timeOutStr = this.isFlight() ? this.record.Flight.TimeOut : this.record.Transfer.TimeOut;
            var timeInStr = this.isFlight() ? this.record.Flight.TimeIn : this.record.Transfer.TimeIn;

            var timeOut = parseHHMM(timeOutStr);
            var timeIn = parseHHMM(timeInStr);

            var durationMinutes = timeIn['total'] - timeOut['total'];
            if (durationMinutes < 0) {
                durationMinutes += 24 * 60;
            }

            to = new Date(from);
            to.setMinutes(to.getMinutes() + durationMinutes);
        } else if (this.isDiscontinuity()) {
            to = from;
        } else {
            throw new Error('Unknown type of record');
        }

        return new Range(from, to);
    }

    get departure() {
        if (this.isFlight()) {
            return this.record.Flight.Departure;
        } else if (this.isTransfer()) {
            return this.record.Transfer.Departure;
        } else {
            throw new Error('Departure is not available');
        }
    }

    get destination() {
        if (this.isFlight()) {
            return this.record.Flight.Destination;
        } else if (this.isTransfer()) {
            return this.record.Transfer.Destination;
        } else {
            throw new Error('Destination is not available');
        }
    }

    get timeOut() {
        if (this.isFlight()) {
            return this.record.Flight.TimeOut;
        } else if (this.isTransfer()) {
            return this.record.Transfer.TimeOut;
        } else {
            throw new Error('TimeOut is not available');
        }
    }

    get timeOff() {
        if (this.isFlight()) {
            return this.record.Flight.TimeOff;
        } else {
            throw new Error('TimeOff is not available');
        }
    }

    get timeOn() {
        if (this.isFlight()) {
            return this.record.Flight.TimeOn;
        } else {
            throw new Error('TimeOn is not available');
        }
    }

    get timeIn() {
        if (this.isFlight()) {
            return this.record.Flight.TimeIn;
        } else if (this.isTransfer()) {
            return this.record.Transfer.TimeIn;
        } else {
            throw new Error('TimeIn is not available');
        }
    }

    get totalTime() {
        if (this.isFlight()) {
            return this.record.Flight.TotalTime;
        } else {
            throw new Error('TotalTime is not available');
        }
    }

    get airTime() {
        if (this.isFlight()) {
            return this.record.Flight.AirTime;
        } else {
            throw new Error('AirTime is not available');
        }
    }

    get distance() {
        if (this.isFlight()) {
            return this.record.Flight.Distance;
        } else {
            throw new Error('Distance is not available');
        }
    }

    get comment() {
        return this.record.Comment;
    }

    get remarks() {
        return this.record.Remarks;
    }

    isFlight() {
        return RecordType.isFlight(this.record['Type'])
    }

    isTransfer() {
        return RecordType.isTransfer(this.record['Type'])
    }

    isDiscontinuity() {
        return RecordType.isDiscontinuity(this.record['Type'])
    }
}

class Range {
    #from;
    #to;

    constructor(from, to) {
        this.#from = from;
        this.#to = to;
    }

    get from() {
        return this.#from;
    }

    get to() {
        return this.#to;
    }

    isDateWithin(date) {
        return (this.#from < date) && (date < this.#to);
    }
}

const Checks = {
    const: ok = {
        success: true
    },

    checkCompatibility: function (record1, record2) {
        const locationCheck = this.doLocationCheck(record1, record2);

        const rangeCheck = this.doRangeCheck(record1, record2);

        return {
            success: locationCheck.success && rangeCheck.success,
            location: locationCheck,
            range: rangeCheck
        };
    },

    //     F  T  D
    //  F  L  L  x
    //  T  L  L  x
    //  D  x  x  x
    doLocationCheck: function (record1, record2) {
        if (record1.isDiscontinuity() || record2.isDiscontinuity()) {
            return ok;
        }

        const destination1 = record1.destination;
        const departure2 = record2.departure;

        if (destination1 === departure2) {
            return ok;
        } else {
            return {
                success: false,
                message: 'Destination ' + destination1 + ' of previous record and departure ' + departure2 + ' of next record do not match'
            };
        }
    },

    doRangeCheck: function (record1, record2) {
        const range1 = record1.range;
        const range2 = record2.range;

        if (range1.isDateWithin(range2.from)
            || range1.isDateWithin(range2.to)
            || range2.isDateWithin(range1.from)
            || range2.isDateWithin(range1.to)) {
            return {
                success: false,
                message: 'Range overlapping found'
            };
        }

        return ok;
    }
}
