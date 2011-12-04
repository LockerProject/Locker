var messages = require('../Connectors/IMAP/messages');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("IMAP Synclets");
var fs = require('fs');
var curDir = process.cwd();

process.setMaxListeners(0);
process.on('uncaughtException',function(error){
    console.dir(error.stack);
});


var auth = { 
    username: '4bd2c0a23380a878044276c378854f77a5959241bc05d8d9d32adc03ac42e98f',
    password: '8d7513c98dc062c941c6ee8fa813a767',
    host: 'imap.gmail.com',
    port: '993',
    secure: true,
    debug: false 
};
var mePath = '/Data/imap-1';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

suite.next().suite.addBatch({
    "Can get messages in INBOX" : {
        topic: function() {
            process.chdir('.' + mePath);
            pinfo.auth = auth;
            messages.sync(pinfo, this.callback);
        },
        "with all message data" : function(err, response) {
            // console.error("DEBUG: response", response.data.message);
            assert.equal(response.data.message.length, 14);
            assert.equal(response.data.message[0].obj.id, "INBOX||4");
            assert.equal(response.data.message[0].obj.messageId, 4);
            assert.equal(response.data.message[0].obj.mailbox, "INBOX");
            assert.equal(response.data.message[0].obj.headers.to[0], "testmcchester@gmail.com");
            assert.equal(response.data.message[0].obj.body.length, 1);
            assert.equal(response.data.message[0].obj.body[0].type, 'text');
            assert.equal(response.data.message[0].timestamp.getTime(), new Date("Thu, 02 Jun 2011 17:24:04 GMT").getTime());
        },
        "with all state data" : function(err, response) {
            // console.error("DEBUG: response", response.config.updateState);
            assert.isNotNull(response.config);
            assert.isNotNull(response.config.updateState);
            assert.isNotNull(response.config.updateState.messages);
            assert.equal(Object.keys(response.config.updateState.messages).length, 9);
            assert.isNotNull(response.config.updateState.messages.INBOX);
            assert.equal(response.config.updateState.messages.INBOX.syncedThrough, 8);
            assert.isNotNull(response.config.updateState.messages['[Gmail]/Drafts']);
            assert.equal(response.config.updateState.messages['[Gmail]/Drafts'].syncedThrough, 1);
            assert.isNotNull(response.config.updateState.messages['[Gmail]/Sent Mail']);
            assert.equal(response.config.updateState.messages['[Gmail]/Sent Mail'].syncedThrough, 1);
            assert.isNotNull(response.config.updateState.messages['[Gmail]/All Mail']);
            assert.equal(response.config.updateState.messages['[Gmail]/All Mail'].syncedThrough, 11);
        }
    }
}).addBatch({
    "cleanup" : {
        topic: [],
        "after itself": function(topic) {
            process.chdir(curDir);
            assert.equal(process.cwd(), curDir);
        }
    }
})

suite.export(module);
