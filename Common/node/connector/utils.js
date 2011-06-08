exports.checkDeletedIDs = function(knownIDs, returnedIDs) {
    if (knownIDs && returnedIDs) {
        var newIDs = [],
            repeatedIDs = {},
            removedIDs = [];

        // hack to handle pre-existing objects instead of arrays, should probably have a way to wipe out /Me directories
        // after making changes that break existing data
        //
        if (!(Array.isArray(knownIDs))) {
            var tempIDs = knownIDs;
            knownIDs = [];
            for (var i in tempIDs)
                knownIDs.push(i);
        }
        returnedIDs.forEach(function(id) {
            if (knownIDs.indexOf(id) !== -1)
                repeatedIDs[id] = 1;
        });
        
        knownIDs.forEach(function(id) {
            if(!repeatedIDs[id])
                removedIDs.push(id);
        });

        return removedIDs;
    } else if (knownIDs) {
        return knownIDs;
    } else {
        return [];
    }
}