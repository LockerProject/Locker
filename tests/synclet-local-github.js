var fakeweb = require('node-fakeweb');
var users = require('../Connectors/GitHub/users');
var repos = require('../Connectors/GitHub/repos');
var profile = require('../Connectors/GitHub/profile');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("Github Synclet");
var fs = require('fs');
var curDir = process.cwd();

process.setMaxListeners(0);
process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/github-1';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

suite.next().suite.addBatch({
    "Can get profile" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://api.github.com:443/user?access_token=abc',
                file : __dirname + '/fixtures/github/ctide.json' });
            profile.sync(pinfo, this.callback) },
        "successfully" : function(err, response) {
            assert.equal(response.data.profile[0].login, 'ctide');
        }
    }
})

suite.export(module);
