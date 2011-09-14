module.exports = function(dir) {
    process.chdir(dir);
    var path = require('path');
    var fs = require('fs');
    
    var me = fs.readFileSync('me.json');
    me = JSON.parse(me);
    
    me['events'] = JSON.parse('[["link/facebook","/events"],["link/twitter","/events"]]');
    
    fs.writeFileSync('me.json', JSON.stringify(me), 'utf-8');
    return true;
};