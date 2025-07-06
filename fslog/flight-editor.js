
function addFlightClicked(discontinuityRecordId) {
    hideButton('.add-flight-button');
    hideButton('.add-transfer-button');
    hideButton('.start-flight-button');
    hideButton('.start-transfer-button');

    let previousRecord;
    let nextRecord;

    const discontinuityRecord = findRecordById(discontinuityRecordId);

    if (discontinuityRecordId) {
        nextRecord = new Record(discontinuityRecord);

        const discontinuityRecordIndex = records.indexOf(discontinuityRecord);
        if (discontinuityRecordIndex === 0) { // "add flight" above the first discontinuity ever
            previousRecord = null;
        } else {
            previousRecord = new Record(records[discontinuityRecordIndex - 1]);
        }
    } else { // bottom "add flight", no discontinuity below
        nextRecord = null;
        previousRecord = new Record(records[records.length - 1]);
    }

    const editorHtml = $("#flightEditorTemplate").html();
    const elementAfterEditor = discontinuityRecord
        ? Flightlog.findElementByRecord(discontinuityRecord)
        : $('.today-add-entry-row').first();
    editorRow = $(editorHtml).insertBefore(elementAfterEditor);

    editorRow.mode = 'add';

    editorRow.fields = {};
    editorRow.calculated = {};

    editorRow.previousRecord = previousRecord;
    editorRow.nextRecord = nextRecord;

    editorRow.fields.date = editorRow.find('#flightEditor-date').on('input', makeBoldIfValuePresent); // todo ak date format input processing
    editorRow.fields.dateLimits = editorRow.find('#flightEditor-dateLimits');

    editorRow.fields.callsign = editorRow.find('#flightEditor-callsign').on('input', makeBoldIfValuePresent);
    editorRow.fields.flightNumber = editorRow.find('#flightEditor-flightNumber').on('input', makeBoldIfValuePresent);
    editorRow.fields.aircraftType = editorRow.find('#flightEditor-aircraftType').on('input', makeBoldIfValuePresent);

    editorRow.fields.aircraftRegistration = editorRow.find('#flightEditor-aircraftRegistration').on('input', makeBoldIfValuePresent);

    editorRow.fields.departure = editorRow.find('#flightEditor-from').on('input', makeBoldIfValuePresent);
    editorRow.fields.departureName = editorRow.find('#flightEditor-fromName');
    editorRow.fields.departure.keyup(airportEditorKeyUp);

    editorRow.fields.destination = editorRow.find('#flightEditor-to').on('input', makeBoldIfValuePresent);
    editorRow.fields.destinationName = editorRow.find('#flightEditor-toName');
    editorRow.fields.destination.keyup(airportEditorKeyUp);

    editorRow.fields.timeOut = editorRow.find('#flightEditor-timeOut');
    editorRow.fields.timeOut.keypress(timeEditorKeyPress).keyup(flightTimeEditorKeyUp);
    editorRow.fields.timeOff = editorRow.find('#flightEditor-timeOff');
    editorRow.fields.timeOff.keypress(timeEditorKeyPress).keyup(flightTimeEditorKeyUp);

    editorRow.fields.timeOn = editorRow.find('#flightEditor-timeOn');
    editorRow.fields.timeOn.keypress(timeEditorKeyPress).keyup(flightTimeEditorKeyUp);
    editorRow.fields.timeIn = editorRow.find('#flightEditor-timeIn');
    editorRow.fields.timeIn.keypress(timeEditorKeyPress).keyup(flightTimeEditorKeyUp);

    editorRow.fields.totalTime = editorRow.find('#flightEditor-totalTime');
    editorRow.fields.distance = editorRow.find('#flightEditor-distance');

    editorRow.fields.comment = editorRow.find('#flightEditor-comment');
    editorRow.fields.remarks = editorRow.find('#flightEditor-remarks');

    const limitSinceDateOfFlight = previousRecord ? previousRecord.date : null;
    const limitTillDateOfFlight = nextRecord ? nextRecord.date : null;
    const prefilledDateOfFlight = limitTillDateOfFlight === null
        ? today()
        : (limitSinceDateOfFlight === null ? today() : limitSinceDateOfFlight);
    editorRow.fields.date.val(prefilledDateOfFlight);

    if (limitSinceDateOfFlight === null && limitTillDateOfFlight === null) {
        editorRow.fields.dateLimits.val("No date limits found");
    } else if (limitSinceDateOfFlight !== null && limitTillDateOfFlight !== null) {
        editorRow.fields.dateLimits.val("Date since " + limitSinceDateOfFlight + " till " + limitTillDateOfFlight);
    } else if (limitSinceDateOfFlight === null) {
        editorRow.fields.dateLimits.val("Date till " + limitTillDateOfFlight);
    } else { // limitTillDateOfFlight === null
        editorRow.fields.dateLimits.val("Date since " + limitSinceDateOfFlight);
    }

    const previousRecordIsFlight = previousRecord && previousRecord.isFlight();

    editorRow.fields.callsign.val(previousRecordIsFlight ? previousRecord.callsign : undefined).trigger('input');
    editorRow.fields.flightNumber.val(previousRecordIsFlight ? previousRecord.flightNumber : undefined).trigger('input');
    editorRow.fields.aircraftType.val(previousRecordIsFlight ? previousRecord.aircraftType : undefined).trigger('input');
    editorRow.fields.aircraftRegistration.val(previousRecordIsFlight ? previousRecord.aircraftRegistration : undefined).trigger('input');
    editorRow.fields.remarks.val(previousRecordIsFlight ? previousRecord.remarks : undefined).trigger('input');

    if (previousRecordIsFlight || previousRecord.isTransfer()) {
        editorRow.fields.departure.val(previousRecord.destination).trigger('input');
        disableField(editorRow.fields.departure);
    }

    refreshAirportNamesInEditor();
}

function editFlightClicked(flightRecordId) {
    hideButton('.add-flight-button');
    hideButton('.add-transfer-button');
    hideButton('.start-flight-button');
    hideButton('.start-transfer-button');

    const flightRecord = findRecordById(flightRecordId);
    const flightRow = Flightlog.findElementByRecord(flightRecord);
    flightRow.hide();

    let previousRecord;
    let nextRecord;

    const flightRecordIndex = records.indexOf(flightRecord);
    if (flightRecordIndex === records.length-1) { // "edit flight" for the last flight record ever
        nextRecord = null;
    } else {
        nextRecord = records[flightRecordIndex + 1];
    }
    if (flightRecordIndex === 0) {
        previousRecord = null;
    } else {
        previousRecord = records[flightRecordIndex - 1];
    }

    const editorHtml = $("#flightEditorTemplate").html();
    const elementAfterEditor = nextRecord
        ? Flightlog.findElementByRecord(nextRecord)
        : $('.today-add-entry-row').first();
    editorRow = $(editorHtml).insertBefore(elementAfterEditor);

    editorRow.mode = 'edit';
    editorRow.record = flightRecord;
    editorRow.recordRow = flightRow;

    editorRow.fields = {};
    editorRow.calculated = {};

    editorRow.previousRecord = previousRecord;
    editorRow.nextRecord = nextRecord;

    editorRow.fields.date = editorRow.find('#flightEditor-date');
    editorRow.fields.dateLimits = editorRow.find('#flightEditor-dateLimits');

    editorRow.fields.callsign = editorRow.find('#flightEditor-callsign');
    editorRow.fields.flightNumber = editorRow.find('#flightEditor-flightNumber');
    editorRow.fields.aircraftType = editorRow.find('#flightEditor-aircraftType');
    editorRow.fields.aircraftRegistration = editorRow.find('#flightEditor-aircraftRegistration');

    editorRow.fields.departure = editorRow.find('#flightEditor-from');
    editorRow.fields.departureName = editorRow.find('#flightEditor-fromName');

    editorRow.fields.destination = editorRow.find('#flightEditor-to');
    editorRow.fields.destinationName = editorRow.find('#flightEditor-toName');

    editorRow.fields.timeOut = editorRow.find('#flightEditor-timeOut');
    editorRow.fields.timeOff = editorRow.find('#flightEditor-timeOff');

    editorRow.fields.timeOn = editorRow.find('#flightEditor-timeOn');
    editorRow.fields.timeIn = editorRow.find('#flightEditor-timeIn');

    editorRow.fields.totalTime = editorRow.find('#flightEditor-totalTime');
    editorRow.fields.distance = editorRow.find('#flightEditor-distance');

    editorRow.fields.comment = editorRow.find('#flightEditor-comment');
    editorRow.fields.remarks = editorRow.find('#flightEditor-remarks');

    editorRow.fields.date.val(flightRecord.Date);
    disableField(editorRow.fields.date);
    editorRow.fields.dateLimits.val("");

    editorRow.fields.callsign.val(flightRecord.Flight.Callsign);
    editorRow.fields.flightNumber.val(flightRecord.Flight.FlightNumber);
    editorRow.fields.aircraftType.val(flightRecord.Flight.AircraftType);
    editorRow.fields.aircraftRegistration.val(flightRecord.Flight.AircraftRegistration);

    editorRow.fields.departure.val(flightRecord.Flight.Departure);
    disableField(editorRow.fields.departure);
    editorRow.fields.destination.val(flightRecord.Flight.Destination);
    disableField(editorRow.fields.destination);

    editorRow.fields.timeOut.val(flightRecord.Flight.TimeOut);
    disableField(editorRow.fields.timeOut);
    editorRow.fields.timeOff.val(flightRecord.Flight.TimeOff);
    disableField(editorRow.fields.timeOff);

    editorRow.fields.timeOn.val(flightRecord.Flight.TimeOn);
    disableField(editorRow.fields.timeOn);
    editorRow.fields.timeIn.val(flightRecord.Flight.TimeIn);
    disableField(editorRow.fields.timeIn);

    editorRow.fields.totalTime.val(flightRecord.Flight.TotalTime);
    editorRow.fields.distance.val(flightRecord.Flight.Distance);

    editorRow.fields.comment.val(flightRecord.Comment);
    editorRow.fields.remarks.val(flightRecord.Remarks);

    refreshAirportNamesInEditor();
}

function saveFlightClicked() {
    const mode = editorRow.mode;
    if (mode === 'add') {
        saveNewFlight();
    } else if (mode === 'edit') {
        updateExistingFlight();
    }
}

function saveNewFlight() {
    const dateOfFlight = editorRow.fields.date.val();
    // todo ak check date format
    // todo ak check date limits
    // todo ak check date-time overlapping with other flights
    const flight = {
        "UserID": myUserId,
        "BeginningDT": dateOfFlight + 'T' + editorRow.fields.timeOut.val(),
        "RecordID": generateUUID(),
        "Type": "flight",
        "Date": dateOfFlight,
        "Flight": {
            "Callsign": nonEmptyUpperCase(editorRow.fields.callsign.val()),
            "FlightNumber": nonEmptyUpperCase(editorRow.fields.flightNumber.val()),
            "AircraftType": nonEmptyUpperCase(editorRow.fields.aircraftType.val()),
            "AircraftRegistration": nonEmptyUpperCase(editorRow.fields.aircraftRegistration.val()),
            "Departure": nonEmptyUpperCase(editorRow.fields.departure.val()),
            "Destination": nonEmptyUpperCase(editorRow.fields.destination.val()),
            "TimeOut": nonEmpty(editorRow.fields.timeOut.val()),
            "TimeOff": nonEmpty(editorRow.fields.timeOff.val()),
            "TimeOn": nonEmpty(editorRow.fields.timeOn.val()),
            "TimeIn": nonEmpty(editorRow.fields.timeIn.val()),
            "Distance": nonEmptyInt(editorRow.fields.distance.val()),
            "TotalTime": nonEmpty(editorRow.calculated.totalTime),
            "AirTime": nonEmpty(editorRow.calculated.airTime)
        },
        "Comment": nonEmpty(editorRow.fields.comment.val()),
        "Remarks": nonEmpty(editorRow.fields.remarks.val())
    };

    let results = [];
    results.push(validateFieldNonEmpty(flight["Date"], editorRow.fields.date));
    results.push(validateFieldNonEmpty(flight["Flight"]["AircraftType"], editorRow.fields.aircraftType));
    results.push(validateFieldNonEmpty(flight["Flight"]["Departure"], editorRow.fields.departure));
    results.push(validateFieldNonEmpty(flight["Flight"]["Destination"], editorRow.fields.destination));
    results.push(validateFieldNonEmpty(flight["Flight"]["TimeOut"], editorRow.fields.timeOut));
    results.push(validateFieldNonEmpty(flight["Flight"]["TimeIn"], editorRow.fields.timeIn));
    results.push(validateFieldNonEmpty(flight["Flight"]["Distance"], editorRow.fields.distance));
    for (let i = 0; i < results.length; i++) {
        if (!results[i]) {
            return;
        }
    }

    $.ajax({
        url: gatewayUrl,
        method: 'POST',
        headers: {
            'Authorization': authToken
        },
        dataType: 'json',
        data: JSON.stringify(flight),
        success: function (response) {/**/
            showAlert("Flight added successfully", "success", 5000);
            insertRecordAfterAndUpdateFlightlog(editorRow.previousRecord.record, flight);
            discardClicked();
        },
        error: function (e) {
            showAlert("Error happened!", "danger", 15000);
            console.log(e.responseText);
        }
    });/**/
}

function updateExistingFlight() {
    const flight = editorRow.record;
    flight.Flight.Callsign = nonEmptyUpperCase(editorRow.fields.callsign.val());
    flight.Flight.FlightNumber = nonEmptyUpperCase(editorRow.fields.flightNumber.val());
    flight.Flight.AircraftType = nonEmptyUpperCase(editorRow.fields.aircraftType.val());
    flight.Flight.AircraftRegistration = nonEmptyUpperCase(editorRow.fields.aircraftRegistration.val());
    flight.Flight.Distance = nonEmptyInt(editorRow.fields.distance.val());
    flight.Comment = nonEmpty(editorRow.fields.comment.val());
    flight.Remarks = nonEmpty(editorRow.fields.remarks.val());

    $.ajax({
        url: gatewayUrl,
        method: 'POST',
        headers: {
            'Authorization': authToken
        },
        dataType: 'json',
        data: JSON.stringify(flight),
        success: function (response) {/**/
            showAlert("Flight updated successfully", "success", 5000);
            records[records.indexOf(editorRow.record)] = flight;
            editorRow.recordRow.html(makeFlightInfoHtml(flight, editorRow.record.mode));
            flight.mode = editorRow.record.mode;
            editorRow.recordRow.show();
            discardClicked();
        },
        error: function (e) {
            showAlert("Error happened!", "danger", 15000);
            console.log(e.responseText);
        }
    });/**/
}

function flightTimeEditorKeyUp() {
    recalculateFlightTimeFields();
}

function recalculateFlightTimeFields() {
    const timeOutStr = editorRow.fields.timeOut.val();
    const timeOffStr = editorRow.fields.timeOff.val();
    const timeOnStr = editorRow.fields.timeOn.val();
    const timeInStr = editorRow.fields.timeIn.val();

    const timeOut = parseHHMM(timeOutStr);
    const timeOff = parseHHMM(timeOffStr);
    const timeOn = parseHHMM(timeOnStr);
    const timeIn = parseHHMM(timeInStr);

    if (timeOut && timeIn) {
        let time = timeIn['total'] - timeOut['total'];
        if (time < 0) {
            time += 24 * 60;
        }
        const totalTimeStr = formatMinutesAsHMM(time);
        editorRow.calculated.totalTime = totalTimeStr;
        editorRow.fields.totalTime.val(totalTimeStr);
    } else {
        editorRow.calculated.totalTime = null;
        editorRow.fields.totalTime.val(null);
    }

    if (timeOff && timeOn) {
        let time = timeOn['total'] - timeOff['total'];
        if (time < 0) {
            time += 24 * 60;
        }
        editorRow.calculated.airTime = formatMinutesAsHMM(time);
    } else {
        editorRow.calculated.airTime = null;
    }
}






function makeFlightInfoHtml(record, mode) {
    let html = mode === "short"
        ? $("#flightShortInfoTemplate").html()
        : $("#flightFullInfoTemplate").html();
    const departureIcao = record.Flight.Departure;
    const destinationIcao = record.Flight.Destination;
    html = html
        .replaceAll("$recordId$", record.RecordID)
        .replace("$flight$", record.Flight.FlightNumber || '&nbsp;')
        .replace("$callsign$", record.Flight.Callsign || '&nbsp;')
        .replace("$type$", record.Flight.AircraftType || '&nbsp;')
        .replace("$reg$", record.Flight.AircraftRegistration || '&nbsp;')
        .replace("$dep$", departureIcao || '&nbsp;')
        .replace("$depName$", "<span class='" + departureIcao + "'>" + departureIcao + "</span>")
        .replace("$dest$", destinationIcao || '&nbsp;')
        .replace("$destName$", "<span class='" + destinationIcao + "'>" + destinationIcao + "</span>")
        .replace("$timeOut$", record.Flight.TimeOut || '&nbsp;')
        .replace("$timeOff$", record.Flight.TimeOff || 'n/a')
        .replace("$timeOn$", record.Flight.TimeOn || 'n/a')
        .replace("$timeIn$", record.Flight.TimeIn || '&nbsp;')
        .replace("$totalTime$", record.Flight.TotalTime || '&nbsp;')
        .replace("$airTime$", record.Flight.AirTime || '&nbsp;')
        .replace("$dist$", record.Flight.Distance || '&nbsp;')
        .replace("$dctDist$", 'n/a')
        .replace("$comment$", record.Comment || '&nbsp;')
        .replace("$remarks$", record.Remarks || '&nbsp;');

    loadAndShowAirportInfo(departureIcao);
    loadAndShowAirportInfo(destinationIcao);

    record.mode = mode;

    return html;
}

function switchFlightViewModeClicked(recordId) {
    const record = findRecordById(recordId);
    if (!record) {
        alert("cant find record");
        return;
    }

    let mode = record.mode;
    if (mode === "short") {
        mode = "full";
    } else {
        mode = "short";
    }
    record.mode = mode;
    const flightHtml = makeFlightInfoHtml(record, mode);

    const row = Flightlog.findElementByRecord(record);
    row.html(flightHtml);
}
