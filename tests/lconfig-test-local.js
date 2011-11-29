var lconfig = require('../Common/node/lconfig.js');
var assert = require("assert");
var vows = require("vows");


vows.describe("Locker Config").addBatch({
    "Can load config from a file" : {
        topic:  function() {
            lconfig.load('fixtures/lconfig/config-1.json');
            this.callback();
        },
        "loads expected values" : function() {
            assert.equal(lconfig.lockerPort, 4242);
            assert.equal(lconfig.lockerHost, "localhost");
            assert.equal(lconfig.lockerBase, "http://localhost:4242");
            assert.equal(lconfig.externalPort, 80);
            assert.equal(lconfig.externalHost, "example.com");
            assert.equal(lconfig.externalSecure, false);
            assert.equal(lconfig.externalBase, "http://example.com");
            assert.isDefined(lconfig.logging);
            assert.equal(lconfig.logging.file, "locker-tests.out");
            assert.equal(lconfig.logging.level, "error");
            assert.equal(lconfig.logging.console, false);
            assert.equal(lconfig.logging.maxsize, 256*1024*1024);
        },
    }
}).addBatch({
    "Can load config from a file with a 443 external port" : {
        topic: function() {
            lconfig.load('fixtures/lconfig/config-2.json');
            this.callback();
        },
        "loads expected values" : function() {
            assert.equal(lconfig.externalPort, 443);
            assert.equal(lconfig.externalHost, "example.com");
            assert.equal(lconfig.externalBase, "https://example.com");
        }
    }
}).addBatch({
    "Can load config from a file with a 443 external port, but with externalSecure == false" : {
        topic: function() {
            lconfig.load('fixtures/lconfig/config-3.json');
            this.callback();
        },
        "loads expected values" : function() {
            assert.equal(lconfig.externalPort, 443);
            assert.equal(lconfig.externalHost, "example.com");
            assert.equal(lconfig.externalBase, "http://example.com");
        }
    }
}).addBatch({
    "Can load config from a file with a different external port, but with externalSecure == true" : {
        topic: function() {
            lconfig.load('fixtures/lconfig/config-4.json');
            this.callback();
        },
        "loads expected values" : function() {
            assert.equal(lconfig.externalPort, 8443);
            assert.equal(lconfig.externalHost, "example.com");
            assert.equal(lconfig.externalBase, "https://example.com:8443");
        }
    }
}).addBatch({
    "Can reload original config" : {
        topic: function() {
            lconfig.load("Config/config.json");
            this.callback();
        },
        "loads expected values" : function() {
            assert.equal(lconfig.lockerBase, 'http://localhost:8043');
        }
    }
}).export(module);