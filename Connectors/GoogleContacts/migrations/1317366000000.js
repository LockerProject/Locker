module.exports = function(dir) {
    process.chdir(dir);
    var path = require('path');
    var fs = require('fs');
    
    var me = JSON.parse(fs.readFileSync('me.json'));
    
    if (me.synclets && me.auth) {
        var apikeys = JSON.parse(fs.readFileSync('../../Config/apikeys.json'));
        me.auth.clientID = apikeys.gcontacts.appKey;
        me.auth.clientSecret = apikeys.gcontacts.appSecret;
        fs.writeFileSync('me.json', JSON.stringify(me, null, 4));
    }
    
    return true;
};