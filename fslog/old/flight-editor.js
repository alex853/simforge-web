var FlightEditor = {
    onAddClicked: function (index) {
        var previousRecord = new Record(records[index]);

        var isPreviousFlight = previousRecord.isFlight();

        this.dialog.action = 'add';

        this.dialog.find('.modal-title').text('Add Flight');

        var isLast = index === records.length - 1;

        if (isLast) {
            enableField(this.dateOfFlightField).val(new Date().toISOString().split('T')[0]);
        } else {
            enableField(this.dateOfFlightField).val(undefined);
        }
        enableField(this.callsignField).val(isPreviousFlight ? previousRecord.callsign : undefined);
        enableField(this.flightNumberField).val(isPreviousFlight ? previousRecord.flightNumber : undefined);
        enableField(this.aircraftTypeField).val(isPreviousFlight ? previousRecord.aircraftType : undefined);
        enableField(this.aircraftRegistrationField).val(isPreviousFlight ? previousRecord.aircraftRegistration : undefined);
        if (previousRecord.isFlight() || previousRecord.isTransfer()) {
            disableField(this.departureField).val(previousRecord.destination);
        } else {
            enableField(this.departureField).val(undefined);
        }
        enableField(this.destinationField).val(undefined);
        enableField(this.timeOutField).val(undefined);
        enableField(this.timeOffField).val(undefined);
        enableField(this.timeOnField).val(undefined);
        enableField(this.timeInField).val(undefined);
        this.updateTotalTime();
        this.updateAirTime();
        this.updateCrowFlightDistance();
        enableField(this.distanceField).val(undefined);
        enableField(this.commentField).val(undefined);
        enableField(this.remarksField).val(undefined);

        hideButton(this.editButton);
        showButton(this.applyButton);

        this.dialog.modal();
    },

    onDetailsClicked: function (index) {
        var flight = new Record(records[index]);

        this.dialog.action = 'details';

        this.dialog.find('.modal-title').text('Flight Details');

        disableField(this.dateOfFlightField).val(flight.date);
        disableField(this.callsignField).val(flight.callsign);
        disableField(this.flightNumberField).val(flight.flightNumber);
        disableField(this.aircraftTypeField).val(flight.aircraftType);
        disableField(this.aircraftRegistrationField).val(flight.aircraftRegistration);
        disableField(this.departureField).val(flight.departure);
        disableField(this.destinationField).val(flight.destination);
        disableField(this.timeOutField).val(flight.timeOut);
        disableField(this.timeOffField).val(flight.timeOff);
        disableField(this.timeOnField).val(flight.timeOn);
        disableField(this.timeInField).val(flight.timeIn);
        this.totalTimeField.val(flight.totalTime);
        this.airTimeField.val(flight.airTime);
        this.updateCrowFlightDistance();
        disableField(this.distanceField).val(flight.distance);
        disableField(this.commentField).val(flight.comment);
        disableField(this.remarksField).val(flight.remarks);

        showButton(this.editButton);
        hideButton(this.applyButton);

        this.dialog.modal();
    },

    onDeleteClicked: function (index) {
        var record = new Record(records[index]);
        var nextRecord = (index + 1 < records.length) ? new Record(records[index + 1]) : null;

        var confirmed = confirm('Please confirm that the flight record should be deleted'); // todo confirmation dialog
        if (!confirmed) {
            return;
        }

        if (nextRecord && !nextRecord.isDiscontinuity()) {
            // this will replace the flight record with the discontinuity record
            const newDiscontinuity = {
                "UserID": record.record.UserID,
                "BeginningDT": record.record.BeginningDT,
                "RecordID": generateUUID(),
                "Type": "discontinuity",
                "Date": record.record.Date,
                "Discontinuity": {
                    "Time": record.record.TimeOut
                },
                "Comment": "The discontinuity added after flight record deletion",
                "Remarks": null
            };

            $.ajax({
                url: gatewayUrl,
                method: 'POST',
                dataType: 'json',
                data: JSON.stringify(newDiscontinuity),
                success: function (response) {
                    showAlert("Flight removed successfully", "success", 5000);
                    // todo update grid
                },
                error: function (e) {
                    showAlert("Error happened!", "danger", 15000);
                    console.log(e.responseText);
                }
            });
        } else {
            $.ajax({
                url: gatewayUrl,
                method: 'DELETE',
                dataType: 'json',
                data: JSON.stringify({
                    "UserID": record.record.UserID,
                    "BeginningDT": record.record.BeginningDT
                }),
                success: function (response) {
                    showAlert("Flight removed successfully", "success", 5000);
                    // todo update grid
                },
                error: function (e) {
                    showAlert("Error happened!", "danger", 15000);
                    console.log(e.responseText);
                }
            });
        }
    },

    updateCrowFlightDistance: function () {
        var from = nonEmpty(this.departureField.val());
        var to = nonEmpty(this.destinationField.val());

        if (!from || !to) {
            FlightEditor.crowFlightDistanceField.val("N/A");
            return;
        }

        $.ajax({
            url: distanceUrl + '/v1/distance?from=$from$&to=$to$'.replace('$from$', from.toUpperCase()).replace('$to$', to.toUpperCase()),
            method: 'GET',
            success: function (response) {
                const distanceStr = response;
                FlightEditor.crowFlightDistanceField.val(distanceStr);
                FlightEditor.revalidateDistanceField();
            },
            error: function (e) {
                FlightEditor.crowFlightDistanceField.val("N/A");
                FlightEditor.revalidateDistanceField();
            }
        });
    },

    revalidateDistanceField: function () {
        const crowFlightDistanceStr = this.crowFlightDistanceField.val();
        if (crowFlightDistanceStr === 'N/A') {
            this.distanceField[0].setCustomValidity('');
            return;
        }
        const crowFlightDistance = parseInt(crowFlightDistanceStr);
        const distance = parseInt(this.distanceField.val());
        if (distance < crowFlightDistance) {
            this.distanceField[0].setCustomValidity('Flown Distance can not be below Crow Flight Distance');
            return;
        }
        this.distanceField[0].setCustomValidity('');
    },

    updateTotalTime: function () {
        this.updateDurationField(this.timeOutField, this.timeInField, this.totalTimeField);
    },

    updateAirTime: function () {
        this.updateDurationField(this.timeOffField, this.timeOnField, this.airTimeField);
    },

    updateDurationField: function (time1Field, time2Field, durationField) {
        var time1 = parseHHMM(nonEmpty(time1Field.val()));
        var time2 = parseHHMM(nonEmpty(time2Field.val()));

        var durationStr = null;
        if (time1 !== undefined && time2 !== undefined) {
            var durationMinutes = time2['total'] - time1['total'];  // todo code duplication
            if (durationMinutes < 0) {
                durationMinutes += 24 * 60;
            }
            durationStr = formatMinutesAsHMM(durationMinutes);
        }
        durationField.val(durationStr);
    },

    edit: function () {
        this.dialog.action = 'edit';

        this.dialog.find('.modal-title').text('Edit Flight');

        enableField(this.dateOfFlightField);
        enableField(this.callsignField);
        enableField(this.flightNumberField);
        enableField(this.aircraftTypeField);
        enableField(this.aircraftRegistrationField);
        disableField(this.departureField); // todo add check!
        disableField(this.destinationField); // todo add check!
        enableField(this.timeOutField);
        enableField(this.timeOffField);
        enableField(this.timeOnField);
        enableField(this.timeInField);
        enableField(this.distanceField);
        enableField(this.commentField);
        enableField(this.remarksField);

        hideButton(this.editButton);
        showButton(this.applyButton);
    },

    apply: function () {
        var action = this.dialog.action;

        var form = $('#flightEditorModal-form')[0];
        var valid = form.checkValidity();
        form.classList.add('was-validated');
        if (!valid) {
            return;
        }

        this.dialog.modal('hide');

        var flight = {
            "UserID": myUserId,
            "BeginningDT": this.dateOfFlightField.val() + 'T' + this.timeOutField.val(),
            "RecordID": generateUUID(),
            "Type": "flight",
            "Date": this.dateOfFlightField.val(),
            "Flight": {
                "Callsign": nonEmptyUpperCase(this.callsignField.val()),
                "FlightNumber": nonEmptyUpperCase(this.flightNumberField.val()),
                "AircraftType": nonEmptyUpperCase(this.aircraftTypeField.val()),
                "AircraftRegistration": nonEmptyUpperCase(this.aircraftRegistrationField.val()),
                "Departure": nonEmptyUpperCase(this.departureField.val()),
                "Destination": nonEmptyUpperCase(this.destinationField.val()),
                "TimeOut": nonEmpty(this.timeOutField.val()),
                "TimeOff": nonEmpty(this.timeOffField.val()),
                "TimeOn": nonEmpty(this.timeOnField.val()),
                "TimeIn": nonEmpty(this.timeInField.val()),
                "Distance": nonEmptyInt(this.distanceField.val()),
                "TotalTime": nonEmpty(this.totalTimeField.val()),
                "AirTime": nonEmpty(this.airTimeField.val())
            },
            "Comment": nonEmpty(this.commentField.val()),
            "Remarks": nonEmpty(this.remarksField.val())
        };

        $.ajax({
            url: gatewayUrl,
            method: 'POST',
            dataType: 'json',
            data: JSON.stringify(flight),
            success: function (response) {
                showAlert("Flight added successfully", "success", 5000); // todo message
                // todo add flight to grid and update grid
            },
            error: function (e) {
                showAlert("Error happened!", "danger", 15000);
                console.log(e.responseText);
            }
        });
    }
}

$(document).ready(function () {
    FlightEditor.dialog = $('#flightEditorModal');

    FlightEditor.dateOfFlightField = $('#flightEditorModal-dateOfFlight');
    FlightEditor.callsignField = $('#flightEditorModal-callsign');
    FlightEditor.flightNumberField = $('#flightEditorModal-flightNumber');
    FlightEditor.aircraftTypeField = $('#flightEditorModal-aircraftType');
    FlightEditor.aircraftRegistrationField = $('#flightEditorModal-aircraftRegistration');
    FlightEditor.departureField = $('#flightEditorModal-departure');
    FlightEditor.destinationField = $('#flightEditorModal-destination');
    FlightEditor.timeOutField = $('#flightEditorModal-timeOut');
    FlightEditor.timeOffField = $('#flightEditorModal-timeOff');
    FlightEditor.timeOnField = $('#flightEditorModal-timeOn');
    FlightEditor.timeInField = $('#flightEditorModal-timeIn');
    FlightEditor.totalTimeField = $('#flightEditorModal-duration');
    FlightEditor.airTimeField = $('#flightEditorModal-airTime');
    FlightEditor.crowFlightDistanceField = $('#flightEditorModal-crowFlightDistance');
    FlightEditor.distanceField = $('#flightEditorModal-distance');
    FlightEditor.commentField = $('#flightEditorModal-comment');
    FlightEditor.remarksField = $('#flightEditorModal-remarks');

    FlightEditor.editButton = $('#flightEditorModal-editButton');
    FlightEditor.applyButton = $('#flightEditorModal-applyButton');

    FlightEditor.departureField.keyup(function () {
        FlightEditor.updateCrowFlightDistance();
    });

    FlightEditor.destinationField.keyup(function () {
        FlightEditor.updateCrowFlightDistance();
    });

    FlightEditor.timeOutField.change(function () {
        FlightEditor.updateTotalTime();
    });

    FlightEditor.timeOffField.change(function () {
        FlightEditor.updateAirTime();
    });

    FlightEditor.timeOnField.change(function () {
        FlightEditor.updateAirTime();
    });

    FlightEditor.timeInField.change(function () {
        FlightEditor.updateTotalTime();
    });

    FlightEditor.distanceField.change(function () {
        FlightEditor.revalidateDistanceField();
    });
});
