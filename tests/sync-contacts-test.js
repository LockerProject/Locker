var contacts = require('../Collections/Contacts/sync.js');
var dataStore = require('../Collections/Contacts/dataStore.js');
var assert = require("assert");
var vows = require("vows");
var currentDir = process.cwd();
var fakeweb = require(__dirname + '/fakeweb.js');
var thecollections;
var lmongoclient = require('../Common/node/lmongoclient.js')("localhost", "27018", "contacts", thecollections);

lmongoclient.connectToMongo(function(thecollections) {
    contacts.init("doesn't matter i don't think", thecollections.contacts);
});

vows.describe("Contacts collection sync").addBatch({
    "Can pull in the contacts from foursquare and twitter" : {
        topic: function() {
            process.chdir('./Me/Contacts');
            contacts.gatherContacts(); },
        "successfully" : function(topic) {
            assert.equal(true, true);
        }
    }
}).addBatch({
    "Tears itself down" : {
        topic: [],
        'sucessfully': function(topic) {
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
}).export(module);