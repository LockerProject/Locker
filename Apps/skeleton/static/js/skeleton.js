/**
 * Just an example of hitting the locker query API (in this case, getting data from the Contacts collection)
 * @property offset {Integer} Optional Where in the contacts collection you want to start.
 * @property limit {Integer} Optional The number of contacts you want returned.
 * @property useJSON {Boolean} Optional Display raw JSON instead of the contact's name.
 */
function getContacts(offset, limit, callback) {
    // set the params if not specified
    var offset = offset || 0; 
    var limit = limit || 100;

    $.getJSON('http://localhost:8042/query/getContact', {'offset':offset, 'limit':limit}, callback);
}

/* jQuery syntactic sugar for onDomReady */
$(function() {
    getContacts(0, 9000, function(contacts) {
        console.log(contacts);
    });
});
