module.exports = function(dir) {
    process.chdir(dir);
    var fs = require('fs');
    
    var me = JSON.parse(fs.readFileSync('me.json'));
    me.config = {
        startIndex: 1, // start over from the beginning
        lastUpdate: 1,
        nextRun: -1    // run right now because the contacts collection will update and we don't have the raw data yet
    };
    fs.writeFileSync('me.json', JSON.stringify(me, null, 4));
    
    return true;
};