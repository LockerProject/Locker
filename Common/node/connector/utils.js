exports.checkDeletedIDs = function(knownIDs, returnedIDs) {
    if (knownIDs && returnedIDs) {
        var newIDs = [],
            repeatedIDs = {},
            removedIDs = [];

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