/* Generic log function for debugging. */
var log = function(msg) { if (console && console.log) console.debug(msg); }

/**
 * Reload the display (get contacts, render them)
 * @property offset {Integer} Optional Where in the contacts collection you want to start.
 * @property limit {Integer} Optional The number of contacts you want returned.
 * @property useJSON {Boolean} Optional Display raw JSON instead of the contact's name.
 */
function reload(offset, limit, useJSON) {
    // set the params if not specified
    var offset = offset || 0; 
    var limit = limit || 100;
    var useJSON = useJSON || false;

    var getContactsCB = function(contacts) {
        alert('meh');
    };

    $.getJSON(
	'/',
	{'offset':offset, 'limit':limit}, 
	getContactsCB
    );
}

/* jQuery syntactic sugar for onDomReady */
$(function() {
    reload(0, 9000, true);
});
