module.exports = function(dir) {
    process.chdir(dir);
    var path = require('path');
    var lutil = require(__dirname + '/../../../Common/node/lutil');
    var fs = require('fs');
    
    var me = JSON.parse(fs.readFileSync('me.json'));
    if(me.config && me.config.updateState && me.config.updateState.tweets && me.config.updateState.tweets.since)
        me.config.updateState.tweets.since = 1;
    lutil.atomicWriteFileSync('me.json', JSON.stringify(me, null, 4));
    
    return true;
};