module.exports = function(dir) {
    var path = require('path');
    var fs = require('fs');
    var lutil = require(__dirname + '/../../../Common/node/lutil');

    var state = JSON.parse(fs.readFileSync(__dirname + '/../../../Me/useui/state.json'));
    state.place = {};
    state.place.count = 0;
    state.place.lastId = '';
    lutil.atomicWriteFileSync(__dirname + '/../../../Me/useui/state.json', JSON.stringify(state, null, 4));
    
    var viewers = JSON.parse(fs.readFileSync(__dirname + '/../../../Me/useui/viewers.json'));
    viewers.places = "helloplaces";
    lutil.atomicWriteFileSync(__dirname + '/../../../Me/useui/viewers.json', JSON.stringify(viewers, null, 4));
    
    return true;
}; 