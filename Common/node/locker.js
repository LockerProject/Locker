var wwwdude = require('wwwdude');
var client = wwwdude.createClient();

var lockerBaseURI = 'http://localhost:8042';

exports.at = function(uri, delayInSec) {
    var at = (new Date().getTime() + (delayInSec * 1000));
    require('sys').debug(at);
    client.get(lockerBaseURI + '/at?uri=' + escape(uri) + '&at=' + at).send();
}