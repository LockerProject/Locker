module.exports = function(dir) {
    process.chdir(dir);
    var fs = require('fs');
    
    var me = JSON.parse(fs.readFileSync('me.json'));
    me.config = null;
    fs.writeFileSync('me.json', JSON.stringify(me, null, 4));
    
    return true;
};