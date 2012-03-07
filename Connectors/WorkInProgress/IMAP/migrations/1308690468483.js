module.exports = function(dir) {
    process.chdir(dir);
    var path = require('path');
    var fs = require('fs');
    
    if (path.exists('allKnownIDs.json')) {
        fs.unlinkSync('allKnownIDs.json');
    }
    if (path.exists('updateState.json')) {
        fs.unlinkSync('updateState.json');
    }
    if (path.exists('messages.json')) {
        fs.unlinkSync('messages.json');
    }
    
    return true;
};