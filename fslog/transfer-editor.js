
function addTransferClicked(discontinuityRecordId) {
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
        if (discontinuityRecordIndex === 0) { // "add transfer" above the first discontinuity ever
            previousRecord = null;
        } else {
            previousRecord = new Record(records[discontinuityRecordIndex - 1]);
        }
    } else { // bottom "add transfer", no discontinuity below
        nextRecord = null;
        previousRecord = new Record(records[records.length - 1]);
    }

    const editorHtml = $("#transferEditorTemplate").html();
    const elementAfterEditor = discontinuityRecord ? Flightlog.findElementByEntry({
        id: 'discontinuity-' + discontinuityRecord.RecordID,
        type: 'discontinuity',
        record: discontinuityRecord
    }) : $('.today-add-entry-row').first();
    editorRow = $(editorHtml).insertBefore(elementAfterEditor);
    editorRow.fields = {};
    editorRow.calculated = {};

    editorRow.previousRecord = previousRecord;
    editorRow.nextRecord = nextRecord;

    editorRow.fields.date = editorRow.find('#transferEditor-date'); // todo ak date format input processing
    editorRow.fields.dateLimits = editorRow.find('#transferEditor-dateLimits');

    editorRow.fields.departure = editorRow.find('#transferEditor-from');
    editorRow.fields.departureName = editorRow.find('#transferEditor-fromName');
    editorRow.fields.departure.keyup(transferAirportEditorKeyUp);

    editorRow.fields.destination = editorRow.find('#transferEditor-to');
    editorRow.fields.destinationName = editorRow.find('#transferEditor-toName');
    editorRow.fields.destination.keyup(transferAirportEditorKeyUp);

    editorRow.fields.timeOut = editorRow.find('#transferEditor-timeOut');
    editorRow.fields.timeOut.keypress(timeEditorKeyPress).keyup(transferTimeEditorKeyUp);

    editorRow.fields.timeIn = editorRow.find('#transferEditor-timeIn');

    editorRow.fields.method = editorRow.find('#transferEditor-method');
    editorRow.fields.method.change(recalculateTransferTimeFields);

    editorRow.fields.totalTime = editorRow.find('#transferEditor-totalTime');
    editorRow.fields.distance = editorRow.find('#transferEditor-distance');

    editorRow.fields.comment = editorRow.find('#transferEditor-comment');
    editorRow.fields.remarks = editorRow.find('#transferEditor-remarks');

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

    if (previousRecord && (previousRecord.isFlight() || previousRecord.isTransfer())) {
        editorRow.fields.departure.val(previousRecord.destination);
        disableField(editorRow.fields.departure);
    }

    refreshAirportNamesInEditor();
}

function saveTransferClicked() {
    const dateOfFlight = editorRow.fields.date.val();
    // todo ak check date format
    // todo ak check date limits
    // todo ak check date-time overlapping with other flights
    const flight = {
        "UserID": myUserId,
        "BeginningDT": dateOfFlight + 'T' + editorRow.fields.timeOut.val(),
        "RecordID": generateUUID(),
        "Type": "transfer",
        "Date": dateOfFlight,
        "Transfer": {
            "Departure": nonEmptyUpperCase(editorRow.fields.departure.val()),
            "Destination": nonEmptyUpperCase(editorRow.fields.destination.val()),
            "TimeOut": nonEmpty(editorRow.fields.timeOut.val()),
            "TimeIn": nonEmpty(editorRow.fields.timeIn.val()),
            "Method": nonEmpty($("input[name='transferEditor-method']:checked").val())
        },
        "Comment": nonEmpty(editorRow.fields.comment.val()),
        "Remarks": nonEmpty(editorRow.fields.remarks.val())
    };

    let results = [];
    results.push(validateFieldNonEmpty(flight["Date"], editorRow.fields.date));
    results.push(validateFieldNonEmpty(flight["Transfer"]["Departure"], editorRow.fields.aircraftType));
    results.push(validateFieldNonEmpty(flight["Transfer"]["Destination"], editorRow.fields.departure));
    results.push(validateFieldNonEmpty(flight["Transfer"]["TimeOut"], editorRow.fields.destination));
    results.push(validateFieldNonEmpty(flight["Transfer"]["TimeIn"], editorRow.fields.timeOut));
    for (let i = 0; i < results.length; i++) {
        if (!results[i]) {
            return;
        }
    }

    $.ajax({
        url: gatewayUrl,
        method: 'POST',
        dataType: 'json',
        data: JSON.stringify(flight),
        success: function (response) {/**/
            showAlert("Transfer added successfully", "success", 5000);

            const record = flight;
            if (editorRow.nextRecord === null) {
                records.push(record);
            } else {
                let index = records.indexOf(editorRow.nextRecord.record);
                records.splice(index, 0, flight);
            }

            const newVisibleEntries = Flightlog.buildVisibleEntries(records);
            const diff = Flightlog.buildDiff(newVisibleEntries, visibleEntries).added;

            for (let i in diff) {
                const curr = diff[i];
                const prev = newVisibleEntries[newVisibleEntries.indexOf(curr)-1]; // todo ak support when the very first element changed
                const prevElement = Flightlog.findElementByEntry(prev);
                Flightlog.insertElementAfter(curr, prevElement);
            }

            visibleEntries = newVisibleEntries;

            discardClicked();
        },
        error: function (e) {
            showAlert("Error happened!", "danger", 15000);
            console.log(e.responseText);
        }
    });
}

function transferTimeEditorKeyUp(e) {
    recalculateTransferTimeFields();
}

function transferAirportEditorKeyUp(e) {
    airportEditorKeyUp(e, function() {
        recalculateTransferTimeFields();
    });
}

function recalculateTransferTimeFields() {
    editorRow.fields.timeIn.val(null);
    editorRow.fields.totalTime.val(null);

    const timeOutStr = editorRow.fields.timeOut.val();
    const timeOut = parseHHMM(timeOutStr);
    if (!timeOut) {
        return;
    }

    const distanceStr = editorRow.fields.distance.val();
    const distance = parseInt(distanceStr, 10);
    if (isNaN(distance)) {
        return;
    }

    const method = $("input[name='transferEditor-method']:checked").val();

    let speed;
    let minTime;
    switch (method) {
        case "roads":
            speed = 30;
            minTime = 0.25;
            break;
        case "flights":
            speed = 400;
            minTime = 2;
            break;
        case "mach-3":
            speed = 1500;
            minTime = 0.25;
            break;
        default:
            return;
    }

    const durationHours = minTime + distance / speed;

    if (durationHours >= 24) {
        return;
    }

    const durationMinutes = Math.round(durationHours * 60);
    const durationStr = formatMinutesAsHMM(durationMinutes);

    let timeInMinutes = timeOut['total'] + durationMinutes;
    if (timeInMinutes >= 24 * 60) {
        timeInMinutes -= 24 * 60;
    }

    const timeInStr = formatMinutesAsHHMM(timeInMinutes);
    editorRow.fields.timeIn.val(timeInStr);
    editorRow.fields.totalTime.val(durationStr);
}






function makeTransferInfoHtml(record) {
    let html = $("#transferInfoTemplate").html();
    const departureIcao = record.Transfer.Departure;
    const destinationIcao = record.Transfer.Destination;
    html = html
        .replace("$dep$", departureIcao || '')
        .replace("$depName$", "<span class='" + departureIcao + "-grey'>" + departureIcao + "</span>")
        .replace("$dest$", destinationIcao || '')
        .replace("$destName$", "<span class='" + destinationIcao + "-grey'>" + destinationIcao + "</span>")
        .replace("$timeOut$", record.Transfer.TimeOut || '')
        .replace("$timeIn$", record.Transfer.TimeIn || '')
        .replace("$comment$", record.Comment || '');

    loadAndShowAirportInfo(departureIcao);
    loadAndShowAirportInfo(destinationIcao);

    return html;
}
