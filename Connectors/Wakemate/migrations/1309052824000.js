// basic example migration, shows how you'd modify data for an installed app.  this will probably never be run since 
// any new connector installed will have a more recent timestamp than this

module.exports = function(dir) {
    process.chdir(dir);
    var path = require('path');
    var fs = require('fs');
    
    var me = JSON.parse(fs.readFileSync('me.json'));
    
    me.run = 'node init.js';
    
    fs.writeFileSync('me.json', JSON.stringify(me, null, 4));
    
    return true;
};