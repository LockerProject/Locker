module.exports = function(dir) {
    process.chdir(dir);

    var fs = require('fs');

    var me = JSON.parse(fs.readFileSync('me.json', 'ascii'));

    if (me.mongoCollections) {
         me.mongoCollections.push('new_collection');
    } else {
        me.mongoCollections = ['new_collection'];
    }

    fs.writeFileSync('me.json', JSON.stringify(me), 'ascii');
    return true;
};