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
var lcrypto = require("lcrypto");
lconfig.load("Config/config.json");
var registry = require("../Ops/registry.js");
try { fs.unlinkSync(path.join(lconfig.lockerDir, lconfig.me, "registry.json")); } catch(e) {}

var suite = vows.describe("Registry");

var installed;
var apps;
var app;
var linkvid = fs.readFileSync(__dirname + '/fixtures/registry/linkvid.json');
suite.addBatch({
    'Can init': {
        topic: function() {
            var self = this;
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({uri : 'http://registry.singly.com/npm/-/all/since?stale=update_after&startkey=1', body:JSON.parse(fs.readFileSync(__dirname + '/fixtures/registry/sync.json')), contentType:"application/json"});
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

/*}).addBatch({
    'Add App': {
        topic: function() {
            var self = this;
            fakeweb.allowNetConnect = false;
            // todo: need header support to add etag for npm
            fakeweb.registerUri({uri : 'http://registry.singly.com:80/npm/app-quartzjer-linkvid', body:linkvid});
            registry.install({name:"app-quartzjer-linkvid"}, function(err, a){
                app = a;
                self.callback();
            })
        },
        "successfully" : function() {
            assert.equal(a.name, "app-quartzjer-linkvid");
        }
    }
*/
})
suite.export(module);
