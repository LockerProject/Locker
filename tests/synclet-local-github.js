var fakeweb = require('node-fakeweb');
var users = require('../Connectors/GitHub/users');
var repos = require('../Connectors/GitHub/repos');
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
    "Can get users" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/user/show/ctide/followers',
                file : __dirname + '/fixtures/github/followers.json' });
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/user/show/fourk',
                file : __dirname + '/fixtures/github/fourk.json' });
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/user/show/smurthas',
                file : __dirname + '/fixtures/github/smurthas.json' });
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/user/show/ctide/following',
                file : __dirname + '/fixtures/github/following.json' });
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/user/show/wmw',
                file : __dirname + '/fixtures/github/wmw.json' });
            users.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            assert.equal(response.data['contact/followers'][0].obj.company, 'Focus.com');
            assert.equal(response.data['contact/followers'][1].obj.id, 399496);
            assert.equal(response.data['contact/following'][0].obj.login, 'wmw');
            assert.equal(response.config.id.followers[0], 'fourk');
        }
    }
}).addBatch({
    "Can get profile" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/repos/show/ctide',
                file : __dirname + '/fixtures/github/repos.json' });
            fakeweb.registerUri({
                uri :'https://github.com/api/v2/json/repos/show/ctide/arenarecapslibrary/watchers',
                file : __dirname + '/fixtures/github/arenarecapslibrary_watchers.json'});
            fakeweb.registerUri({
                uri :'https://github.com/api/v2/json/repos/show/ctide/WoWCombatLogParser/watchers',
                file : __dirname + '/fixtures/github/WoWCombatLogParser_watchers.json'});
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/user/show/ctide',
                file : __dirname + '/fixtures/github/ctide.json' });
            fakeweb.registerUri({
                uri : 'https://api.github.com/repos/ctide/arenarecapslibrary/git/trees/HEAD?recursive=1',
                contentType:"application/json",
                body: JSON.parse(fs.readFileSync(__dirname + '/fixtures/github/arenarecapslibrary_tree.json')) });
            fakeweb.registerUri({
                uri : 'https://api.github.com/repos/ctide/WoWCombatLogParser/git/trees/HEAD?recursive=1',
                contentType:"application/json",
                body: JSON.parse(fs.readFileSync(__dirname + '/fixtures/github/arenarecapslibrary_tree.json')) });
            repos.sync(pinfo, this.callback) },
        "successfully" : function(err, response) {
            assert.equal(response.data.profile[0].obj.login, 'ctide');
            assert.equal(response.data.repo[0].name, 'arenarecapslibrary');
            assert.equal(response.data.repo[0].watchers[0], 'ctide');
            assert.equal(response.data.repo[0].tree[0].path, 'README');
        }
    }
})

suite.export(module);
