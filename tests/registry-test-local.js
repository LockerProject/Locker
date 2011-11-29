/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var vows = require("vows");
var assert = require("assert");
var fs = require('fs');
var path = require('path');
var fakeweb = require('node-fakeweb');
var lconfig = require("lconfig");
lconfig.load("Config/config.json");
var lcrypto = require("lcrypto");
var registry = require("../Ops/registry.js");
try { fs.unlinkSync(path.join(lconfig.lockerDir, lconfig.me, "registry.json")); } catch(e) {}

var suite = vows.describe("Registry");

var installed;
var apps;
suite.addBatch({
    'Can init': {
        topic: function() {
            var self = this;
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({uri : 'http://registry.singly.com/-/all/since?stale=update_after&startkey=1', body:JSON.parse(fs.readFileSync(__dirname + '/fixtures/registry/sync.json')), contentType:"application/json"});
            registry.init(lconfig, lcrypto, function(i){
                installed = i;
                self.callback();
            });
        },
        "successfully" : function() {
            assert.equal(JSON.stringify(installed), "{}");
        }
    }
}).addBatch({
    'Haz Apps': {
        topic: function() {
            apps = registry.getApps();
            this.callback();
        },
        "successfully" : function() {
            assert.equal(Object.keys(apps).length, 4);
        }
    }

}).addBatch({
    'Add App': {
        topic: function() {
            fakeweb.allowNetConnect = false;
            // todo: need header support to add etag for npm
            fakeweb.registerUri({uri : 'http://registry.singly.com:80/app-quartzjer-linkvid', body:fs.readFileSync(__dirname + '/fixtures/registry/linkvid.json'), headers:{"etag":"X"}});
            fakeweb.registerUri({uri : 'http://registry.singly.com:80/app-quartzjer-linkvid/0.0.1', body:fs.readFileSync(__dirname + '/fixtures/registry/linkvid001.json'), headers:{"etag":"X"}});
            fakeweb.registerUri({uri : 'http://jer.iriscouch.com:80/registry/_design/app/_rewrite/app-quartzjer-linkvid/-/app-quartzjer-linkvid-0.0.2.tgz', body:fs.readFileSync(__dirname + '/fixtures/registry/linkvid.tgz'), headers:{"etag":"X"}});
            fakeweb.registerUri({uri : 'http://registry.singly.com/-/all/since?stale=update_after&startkey=1321564291183', body:JSON.parse(fs.readFileSync(__dirname + '/fixtures/registry/sync.json')), contentType:"application/json", headers:{"etag":"X"}});
            registry.install({name:"app-quartzjer-linkvid"}, this.callback)
        },
        "successfully" : function(err, a) {
            assert.equal(a.name, "app-quartzjer-linkvid");
        }
    }
})
suite.export(module);
