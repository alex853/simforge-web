
const Flightlog = {
    buildVisibleEntries: function (records) {
        const result = [];

        let currentDate = undefined;
        let previousIsDiscontinuity = false;

        for (let i = 0; i < records.length; i++) {
            let record = records[i];

            let currentIsDiscontinuity = RecordType.isDiscontinuity(record.Type);
            let toAddDateHeader = false;

            if (currentDate !== record.Date) {
                currentDate = record.Date;

                if (!currentIsDiscontinuity) {
                    toAddDateHeader = true;
                }
            } else if (!currentIsDiscontinuity && previousIsDiscontinuity) {
                toAddDateHeader = true;
            }

            previousIsDiscontinuity = currentIsDiscontinuity;

            if (toAddDateHeader) {
                result.push({
                    id: 'date-header-' + currentDate,
                    type: 'date-header',
                    date: currentDate
                });
            }

            if (RecordType.isFlight(record.Type)) {
                result.push({
                    id: 'flight-' + record.RecordID,
                    type: 'flight',
                    record: record
                });
            } else if (RecordType.isTransfer(record.Type)) {
                result.push({
                    id: 'transfer-' + record.RecordID,
                    type: 'transfer',
                    record: record
                });
            } else { // Discontinuity
                result.push({
                    id: 'discontinuity-' + record.RecordID,
                    type: 'discontinuity',
                    record: record
                });
            }
        }

        return result;
    },

    findElementByEntry: function (entry) {
        let result = undefined;
        $('.flightlog-entry').each(function(i, obj) {
            const curr = $(obj);
            if (!curr.data) {
                return;
            }

            if (entry.type === 'date-header') {
                const currDate = curr.data('date');
                if (currDate === entry.date) {
                    result = curr;
                }
            } else {
                const currRecordId = curr.data('recordId');
                if (currRecordId === entry.record.RecordID) {
                    result = curr;
                }
            }
        });
        return result;
    },

    findElementByRecord: function (record) {
        return Flightlog.findElementByEntry(Flightlog._createEntryByRecord(record));
    },

    _createEntryByRecord: function (record) {
        if (RecordType.isFlight(record.Type)) {
            return {
                id: 'flight-' + record.RecordID,
                type: 'flight',
                record: record
            };
        } else if (RecordType.isTransfer(record.Type)) {
            return {
                id: 'transfer-' + record.RecordID,
                type: 'transfer',
                record: record
            };
        } else { // Discontinuity
            return {
                id: 'discontinuity-' + record.RecordID,
                type: 'discontinuity',
                record: record
            };
        }
    },

    insertElementAfter: function(entry, previousElement) {
        if (entry.type === 'date-header') {
            const html = $("#dateHeader").html()
                .replace("$date$", entry.date)
                .replace("$year$", entry.date.substring(0, 4));
            const dateHeader = $(html).insertAfter(previousElement);
            dateHeader.data("date", entry.date);
        } else if (entry.type === 'flight') {
            const rowHtml = $("#flightRowTemplate").html();
            const row = $(rowHtml).insertAfter(previousElement);
            row.data("recordId", entry.record.RecordID);
            const html = makeFlightInfoHtml(entry.record, "short");
            row.html(html);
        } else if (entry.type === 'transfer') {
            const rowHtml = $("#transferRowTemplate").html();
            const row = $(rowHtml).insertAfter(previousElement);
            row.data("recordId", entry.record.RecordID);
            const html = makeTransferInfoHtml(entry.record);
            row.html(html);
        } else if (entry.type === 'discontinuity') {
            const rowHtml = makeDiscontinuityInfoHtml(entry.record);
            const row = $(rowHtml).insertAfter(previousElement);
            row.data("recordId", entry.record.RecordID);
        }
    },

    removeElement: function (element) {
        $(element).remove();
    },

    buildDiff: function(newEntries, oldEntries) {
        const addedElements = Flightlog._findDiffBetweenEntrySets(newEntries, oldEntries);
        const removedElements = Flightlog._findDiffBetweenEntrySets(oldEntries, newEntries);

        return { added: addedElements, removed: removedElements };
    },

    _findDiffBetweenEntrySets: function (updated, origin) {
        const result = [];
        const originById = {};
        origin.forEach(function(each) {
            originById[each.id] = each;
        });

        updated.forEach(function(updatedValue) {
            const originValue = originById[updatedValue.id];
            if (originValue === undefined) {
                result.push(updatedValue);
            }
        });
        return result;
    }
};
