var fakeweb = require('node-fakeweb');
var contacts = require('../Connectors/GoogleContacts/contacts');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("Google Contacts Synclet");
var fs = require('fs');
var curDir = process.cwd();

process.setMaxListeners(0);
process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/gcontacts';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));
var nextDate;

suite.next().suite.addBatch({
    "Can get contacts" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://www.google.com:443/m8/feeds/contacts/default/full?showdeleted=true&sortorder=ascending&orderby=lastmodified&max-results=100&updated-min=1970-01-01T00%3A00%3A00Z&start-index=1&oauth_token=ert&alt=json',
                file : __dirname + '/fixtures/googleContacts/contacts.json' });
            contacts.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            assert.instanceOf(response.data, Object);
            assert.instanceOf(response.data.contact, Array);
            assert.equal(response.data.contact.length, 2);
            assert.equal(response.data.contact[0].obj.id, '29a2af0a88d07f');
        },
        "and returns a config object indicating that it should keep paging" : function(err, response) {
            assert.instanceOf(response.data, Object);
            assert.instanceOf(response.data.contact, Array);
            assert.instanceOf(response.config, Object);
            assert.equal(response.data.contact.length + 1, response.config.startIndex);
            assert.equal(1, response.config.lastUpdate);
        }
    }
}).addBatch({
    "Upon getting a response with no entries" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://www.google.com:443/m8/feeds/contacts/default/full?showdeleted=true&sortorder=ascending&orderby=lastmodified&max-results=100&updated-min=1970-01-01T00%3A00%3A00Z&start-index=1&oauth_token=ert&alt=json',
                file : __dirname + '/fixtures/googleContacts/contacts2.json' });
            contacts.sync(pinfo, this.callback)
        },
        "returns a config object inficating that it should stop paging" : function(err, response) {
            assert.ok(response.config.lastUpdate > 1);
            assert.equal(response.config.startIndex, 1);
        }
    }
}).addBatch({
    "Can handle token refreshes" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                statusCode: 401,
                uri : 'https://www.google.com:443/m8/feeds/contacts/default/full?showdeleted=true&sortorder=ascending&orderby=lastmodified&max-results=100&updated-min=1970-01-01T00%3A00%3A00Z&start-index=1&oauth_token=ert&alt=json',
                body: ''});
            fakeweb.registerUri({
                uri : 'https://accounts.google.com:443/o/oauth2/token',
                body : JSON.stringify({'access_token':'rty', 'refresh_token':'tyu'}) });
            fakeweb.registerUri({
                uri : 'https://www.google.com:443/m8/feeds/contacts/default/full?showdeleted=true&sortorder=ascending&orderby=lastmodified&max-results=100&updated-min=1970-01-01T00%3A00%3A00Z&start-index=1&oauth_token=rty&alt=json',
                file : __dirname + '/fixtures/googleContacts/contacts.json' });
            contacts.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            assert.instanceOf(response.config, Object);
            assert.instanceOf(response.auth, Object);
            assert.instanceOf(response.auth.token, Object);
            assert.equal(response.auth.clientID, 'qwe');
            assert.equal(response.auth.clientSecret, 'wer');
            assert.equal(response.auth.token.access_token, 'rty');
            assert.equal(response.auth.token.refresh_token, 'tyu');
            assert.equal(response.data.contact.length, 2);
            assert.equal(response.data.contact[0].obj.id, '29a2af0a88d07f');
        }
    }
})

suite.export(module);


function pad(n){
    return n<10 ? '0'+n : n;
}
function getISODateString(dt){
    return dt.getUTCFullYear() + '-' +
           pad(dt.getUTCMonth() + 1) + '-' +
           pad(dt.getUTCDate()) + 'T' +
           pad(dt.getUTCHours()) + ':' +
           pad(dt.getUTCMinutes()) + ':' +
           pad(dt.getUTCSeconds()) + 'Z';
}
