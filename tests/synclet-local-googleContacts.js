var fakeweb = require(__dirname + '/fakeweb.js');
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

suite.next().suite.addBatch({
    "Can get users" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://www.google.com:443/m8/feeds/contacts/default/full?showdeleted=true&sortorder=ascending&orderby=lastmodified&max-results=3000&oauth_token=ert&alt=json',
                file : __dirname + '/fixtures/googleContacts/contacts.json' });
            contacts.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            assert.equal(response.data.contact[0].obj.id, '29a2af0a88d07f');
        }
    }
})

suite.export(module);