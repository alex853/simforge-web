var DiscontinuityEditor = {
    onAddClicked: function (index) {
        var previousRecord = records[index];

        var dialog = $('#discontinuityEditorModal');
        dialog.action = 'add-discontinuity';

        dialog.find('.modal-title').text('Add Discontinuity');

        var isLast = index === records.length - 1;

        if (isLast) {
            $('#discontinuityEditorModal-date').val(new Date().toISOString().split('T')[0]);
        } else {
            $('#discontinuityEditorModal-date').val(undefined);
        }

        dialog.modal();
    },

    onDeleteClicked: function (index) {
        var previousRecord = records[index - 1];
        var record = records[index];
        var nextRecord = records[index + 1];

        var result = Checks.checkCompatibility(new Record(previousRecord), new Record(nextRecord));
        if (!result.success) {
            alert('Unable to remove the discontinuity record due to conditions'); // todo explanation dialog
            return;
        }

        var confirmed = confirm('Please confirm that the discontinuity record should be deleted'); // todo confirmation dialog
        if (!confirmed) {
            return;
        }

        $.ajax({
            url: gatewayUrl,
            method: 'DELETE',
            dataType: 'json',
            data: JSON.stringify({
                "UserID": record["UserID"],
                "BeginningDT": record["BeginningDT"]
            }),
            success: function (response) {
                showAlert("Discontinuity removed successfully", "success", 5000);
                // todo update grid
            },
            error: function (e) {
                showAlert("Error happened!", "danger", 15000);
                console.log(e.responseText);
            }
        });
    },

    apply: function () {
        var dialog = $('#discontinuityEditorModal');
        var action = dialog.action;

        var form = $('#discontinuityEditorModal-form')[0];
        var valid = form.checkValidity();
        form.classList.add('was-validated');
        if (!valid) {
            return;
        }

        dialog.modal('hide');

        var newDiscontinuity = {
            "UserID": myUserId,
            "BeginningDT": $('#discontinuityEditorModal-date').val() + 'T' + $('#discontinuityEditorModal-time').val(),
            "RecordID": generateUUID(),
            "Type": "discontinuity",
            "Date": $('#discontinuityEditorModal-date').val(),
            "Discontinuity": {
                "Time": nonEmpty($('#discontinuityEditorModal-time').val())
            },
            "Comment": nonEmpty($('#discontinuityEditorModal-comment').val()),
            "Remarks": nonEmpty($('#discontinuityEditorModal-remarks').val())
        };

        $.ajax({
            url: gatewayUrl,
            method: 'POST',
            dataType: 'json',
            data: JSON.stringify(newDiscontinuity),
            success: function (response) {
                showAlert("Discontinuity added successfully", "success", 5000);
                // todo update grid
            },
            error: function (e) {
                showAlert("Error happened!", "danger", 15000);
                console.log(e.responseText);
            }
        });
    }
}