var TransferEditor = {
    onAddClicked: function (index) {
        var previousRecord = records[index];

        var dialog = $('#transferEditorModal');
        dialog.action = 'add-transfer';

        dialog.find('.modal-title').text('Add Transfer');

        var isLast = index === records.length - 1;

        if (isLast) {
            $('#transferEditorModal-date').val(new Date().toISOString().split('T')[0]);
        } else {
            $('#transferEditorModal-date').val(undefined);
        }
        if (RecordType.isFlightOrTransfer(previousRecord['Type'])) {
            $('#transferEditorModal-departure').val(
                RecordType.isFlight(previousRecord['Type'])
                    ? previousRecord.Flight.Destination
                    : previousRecord.Transfer.Destination);
            $('#transferEditorModal-departure').prop('disabled', true);
        } else {
            $('#transferEditorModal-departure').val(undefined);
            $('#transferEditorModal-departure').prop('disabled', false);
        }
        $('#transferEditorModal-destination').val(undefined);

        dialog.modal();
    },

    onDeleteClicked: function (index) {
        alert('not implemented');
    },

    updateCrowFlightDistance: function () {
        var from = nonEmpty($('#transferEditorModal-departure').val());
        var to = nonEmpty($('#transferEditorModal-destination').val());

        $.ajax({
            url: distanceUrl + '/v1/distance?from=$from$&to=$to$'.replace('$from$', from.toUpperCase()).replace('$to$', to.toUpperCase()),
            method: 'GET',
            success: function (response) {
                var distanceStr = response;
                $('#transferEditorModal-crowFlightDistance').val(distanceStr);
                TransferEditor.updateDuration();
            },
            error: function (e) {
                $('#transferEditorModal-crowFlightDistance').val("N/A");
                TransferEditor.updateDuration();
            }
        });
    },

    updateDuration: function () {
        var distanceStr = nonEmpty($('#transferEditorModal-crowFlightDistance').val());
        if (distanceStr === 'N/A') {
            $('#transferEditorModal-duration').val(null);
            TransferEditor.resetTimeIn();
            return;
        }

        var distance = parseInt(distanceStr, 10);
        var method = $("input[name='transferEditorModal-method']:checked").val();

        var speed;
        var minTime;
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
                TransferEditor.resetTimeIn();
                return;
        }

        var durationHours = minTime + distance / speed;

        if (durationHours >= 24) {
            TransferEditor.resetTimeIn();
            return;
        }

        var durationMinutes = Math.round(durationHours * 60);
        var durationStr = formatMinutesAsHMM(durationMinutes);
        $('#transferEditorModal-duration').val(durationStr);

        TransferEditor.updateTimeIn();
    },

    updateTimeIn: function () {
        var timeOut = parseHHMM(nonEmpty($('#transferEditorModal-timeOut').val()));
        if (timeOut === undefined) {
            TransferEditor.resetTimeIn();
            return;
        }

        var duration = parseHHMM(nonEmpty($('#transferEditorModal-duration').val()));
        if (duration === undefined) {
            TransferEditor.resetTimeIn();
            return;
        }

        var timeInMinutes = timeOut['total'] + duration['total'];
        if (timeInMinutes >= 24 * 60) {
            timeInMinutes -= 24 * 60;
        }

        var timeInStr = formatMinutesAsHHMM(timeInMinutes);
        $('#transferEditorModal-timeIn').val(timeInStr);
    },

    resetTimeIn: function () {
        $('#transferEditorModal-timeIn').val(null);
    },

    apply: function () {
        var dialog = $('#transferEditorModal');
        var action = dialog.action;

        var form = $('#transferEditorModal-form')[0];
        var valid = form.checkValidity();
        form.classList.add('was-validated');
        if (!valid) {
            return;
        }

        dialog.modal('hide');

        var transfer = {
            "UserID": myUserId,
            "BeginningDT": $('#transferEditorModal-date').val() + 'T' + $('#transferEditorModal-timeOut').val(),
            "RecordID": generateUUID(),
            "Type": "transfer",
            "Date": $('#transferEditorModal-date').val(),
            "Transfer": {
                "Departure": nonEmptyUpperCase($('#transferEditorModal-departure').val()),
                "Destination": nonEmptyUpperCase($('#transferEditorModal-destination').val()),
                "TimeOut": nonEmpty($('#transferEditorModal-timeOut').val()),
                "TimeIn": nonEmpty($('#transferEditorModal-timeIn').val()),
                "Method": $("input[name='transferEditorModal-method']:checked").val()
            },
            "Comment": nonEmpty($('#transferEditorModal-comment').val()),
            "Remarks": nonEmpty($('#transferEditorModal-remarks').val())
        };

        $.ajax({
            url: gatewayUrl,
            method: 'POST',
            dataType: 'json',
            data: JSON.stringify(transfer),
            success: function (response) {
                showAlert("Transfer added successfully", "success", 5000);
                // todo add transfer to grid and update grid
            },
            error: function (e) {
                showAlert("Error happened!", "danger", 15000);
                console.log(e.responseText);
            }
        });
    }
}

$(document).ready(function () {
    $('#transferEditorModal-departure').keyup(function () {
        TransferEditor.updateCrowFlightDistance();
    });

    $('#transferEditorModal-destination').keyup(function () {
        TransferEditor.updateCrowFlightDistance();
    });

    $('#transferEditorModal-timeOut').keyup(function () {
        TransferEditor.updateTimeIn();
    });

    $("input[name='transferEditorModal-method']").change(function () {
        TransferEditor.updateDuration();
    });
});
