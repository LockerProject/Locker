module.exports = function(dir) {
    var path = require('path');
    var fs = require('fs');
    var lutil = require(__dirname + '/../../../Common/node/lutil');

    var state = JSON.parse(fs.readFileSync(__dirname + '/../../../Me/useui/state.json'));
    
    if (state.hasOwnProperty('contact/full')) {
        state.contact = state['contact/full'];
        delete state['contact/full'];
        lutil.atomicWriteFileSync(__dirname + '/../../../Me/useui/state.json', JSON.stringify(state, null, 4));
    }
    
    return true;
};
