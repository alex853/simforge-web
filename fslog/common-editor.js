

function findRecordById(recordId) {
    for (let i = 0; i < records.length; i++) {
        const each = records[i];
        if (each.RecordID === recordId) {
            return each;
        }
    }
}

function insertRecordAfterAndUpdateFlightlog(previousRecord, newRecord) {
    if (previousRecord === null) {
        records.splice(0, 0, newRecord);
    } else {
        const index = records.indexOf(previousRecord);
        records.splice(index+1, 0, newRecord);
    }

    const newVisibleEntries = Flightlog.buildVisibleEntries(records);
    const diff = Flightlog.buildDiff(newVisibleEntries, visibleEntries).added;

    for (let i in diff) {
        const curr = diff[i];
        const currIndex = newVisibleEntries.indexOf(curr);
        const prevElement = currIndex > 0
            ? Flightlog.findElementByEntry(newVisibleEntries[currIndex-1])
            : $('#flightlog-top');
        Flightlog.insertElementAfter(curr, prevElement);
    }

    visibleEntries = newVisibleEntries;
}

function discardClicked() {
    if (editorRow) {
        $("#flightsContainer").find('.fslog-flight-editor').remove();
        $("#flightsContainer").find('.fslog-transfer-editor').remove();

        showButton('.add-flight-button');
        showButton('.add-transfer-button');
        showButton('.start-flight-button');
        showButton('.start-transfer-button');

        editorRow = null;
    }
}

// todo ak3 this refreshAirportNamesInEditor can be reworked into setTimeout solution as it was done for distance field
function airportEditorKeyUp(e, callback) {
    refreshAirportNamesInEditor();
}

function refreshAirportNamesInEditor() {
    editorRow.fields.departureName.html(null);
    editorRow.fields.destinationName.html(null);

    const from = nonEmptyUpperCase(editorRow.fields.departure.val());
    loadAirportInfoIfNeeded(from, function() {
        editorRow.fields.departureName.html(airportInfo_flagNameLimited(from, 40));
    });

    const to = nonEmptyUpperCase(editorRow.fields.destination.val());
    loadAirportInfoIfNeeded(to, function() {
        editorRow.fields.destinationName.html(airportInfo_flagNameLimited(to, 40));
    });
}

function validateFieldNonEmpty(value, field) {
    const conditionResult = value !== undefined && value !== '';
    if (!conditionResult) {
        field.addClass('is-invalid');
        setTimeout(function() { field.removeClass('is-invalid'); }, 10000);
        return false;
    } else {
        return true;
    }
}

function timeEditorKeyPress(e) {
    const charCode = (e.which) ? e.which : e.keyCode

    if (String.fromCharCode(charCode).match(/[^0-9]/g)) {
        return false;
    }

    const editor = $(e.currentTarget);
    let value = editor.val();
    if (value.length === 2) {
        value = value + ':';
        editor.val(value);
    } else if (value.length === 5) {
        return false;
    }

    return true;
}

function hideButton(name) {
    $("#flightsContainer").find(name).addClass('d-none');
}

function showButton(name) {
    $("#flightsContainer").find(name).removeClass('d-none');
}

function makeBoldIfValuePresent() {
    if ($(this).val().trim() !== '') {
        $(this).css('font-weight', 'bold');
    } else {
        $(this).css('font-weight', 'normal');
    }
}
