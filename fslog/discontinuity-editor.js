

function joinDiscontinuityClicked(recordId) {
    const record = findRecordById(recordId);
    const index = records.indexOf(record);

    const previousRecord = records[index - 1];
    const nextRecord = records[index + 1];

    const result = Checks.checkCompatibility(new Record(previousRecord), new Record(nextRecord));
    if (!result.success) {
        alert('Unable to remove the discontinuity record due to conditions'); // todo explanation dialog
        return;
    }

    const confirmed = confirm('Please confirm that the discontinuity record should be deleted'); // todo confirmation dialog
    if (!confirmed) {
        return;
    }

    $.ajax({
        url: gatewayUrl,
        method: 'DELETE',
        headers: {
            'Authorization': authToken
        },
        dataType: 'json',
        data: JSON.stringify({
            "UserID": record["UserID"],
            "BeginningDT": record["BeginningDT"]
        }),
        success: function (response) {/**/
            showAlert("Discontinuity removed successfully", "success", 5000);

            records.splice(index, 1);

            const newVisibleEntries = Flightlog.buildVisibleEntries(records);
            const diff = Flightlog.buildDiff(newVisibleEntries, visibleEntries).removed;

            for (let i in diff) {
                const curr = diff[i];
                const currElement = Flightlog.findElementByEntry(curr);
                Flightlog.removeElement(currElement);
            }

            visibleEntries = newVisibleEntries;

        },
        error: function (e) {
            showAlert("Error happened!", "danger", 15000);
            console.log(e.responseText);
        }
    });/**/
}


function splitFlightlogClicked(previousRecordId) {
    const discontinuityDate = prompt("Please specify discontinuity date");
    if (!discontinuityDate) {
        return;
    }

    const previousRecord = findRecordById(previousRecordId);

    const time = '00:00';
    const discontinuity = {
        "UserID": myUserId,
        "BeginningDT": discontinuityDate + 'T' + time,
        "RecordID": generateUUID(),
        "Type": "discontinuity",
        "Date": discontinuityDate,
        "Discontinuity": {
            "Time": time
        },
        "Comment": ""
    };

    $.ajax({
        url: gatewayUrl,
        method: 'POST',
        headers: {
            'Authorization': authToken
        },
        dataType: 'json',
        data: JSON.stringify(discontinuity),
        success: function (response) {/**/
            showAlert("Discontinuity added successfully", "success", 5000);
            insertRecordAfterAndUpdateFlightlog(previousRecord, discontinuity);
        },
        error: function (e) {
            showAlert("Error happened!", "danger", 15000);
            console.log(e.responseText);
        }
    });/**/
}





function makeDiscontinuityInfoHtml(record) {
    const rowHtml = $("#discontinuityRowTemplate").html();
    return rowHtml
        .replaceAll("$recordId$", record.RecordID)
        .replace("$date$", record.Date)
        .replace("$comment$", record.Comment || '');
}
