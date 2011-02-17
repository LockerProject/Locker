var wwwdude = require('wwwdude');
var client = wwwdude.createClient();

var lockerBaseURI = 'http://localhost:8042';

exports.at = function(uri, delayInSec) {
    client.get(lockerBaseURI + '/at?uri=' + escape(uri) + '&at=' + (new Date().getTime() + (delayInSec * 1000))).send();
}