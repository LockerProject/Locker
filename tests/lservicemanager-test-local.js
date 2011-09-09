/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/*
* Tests the acutal implementation of the lservicemanager.
* See locker-core-ap-test.js for a test of the REST API interface to it.
*/
var vows = require("vows");
var assert = require("assert");
var fs = require("fs");
var util = require("util");
var events = require("events");
var request = require("request");
var testUtils = require(__dirname + "/test-utils.js");
require.paths.push(__dirname + "/../Common/node");
var serviceManager = require("lservicemanager.js");
var lconfig = require("lconfig");
lconfig.load("Config/config.json");
var levents = require('levents');
var path = require('path');

var lmongo = require('../Common/node/lmongo.js');

var normalPort = lconfig.lockerPort;
vows.describe("Service Manager").addBatch({
    "has a map of the available services" : function() {
        assert.include(serviceManager, "serviceMap");
        assert.include(serviceManager.serviceMap(), "available");
        assert.include(serviceManager.serviceMap(), "installed");
    },
    "Available services" : {
        "gathered from the filesystem" : {
            topic:serviceManager.scanDirectory("Connectors"),
            "found at least 10 services": function() {
                assert.ok(serviceManager.serviceMap().available.length > 10);
            },
            "and can be installed" : {
                topic:serviceManager.install({srcdir:"Connectors/Twitter"}),
                "by giving a valid install instance" : function(svcMetaInfo) {
                    assert.include(svcMetaInfo, "id");
                },
                "setting a version number" : function(svcMetaInfo) {
                    assert.notEqual(svcMetaInfo.version, undefined);
                },
                "and by service map says it is installed" : function(svcMetaInfo) {
                    assert.isTrue(serviceManager.isInstalled(svcMetaInfo.id));
                },
                "and by creating a valid service instance directory" : function(svcMetaInfo) {
                    statInfo = fs.statSync(lconfig.me + "/" + svcMetaInfo.id);
                },
                "and passes along the icon": function(svcMetaInfo) {
                    assert.notEqual(svcMetaInfo.icon, undefined);
                }
            }
        }
    },
}).addBatch({
    "Installed services" : {
        "are found" : {
            topic:function() {
                serviceManager.scanDirectory("Tests");
                serviceManager.findInstalled();
                return "";
            },
            "and testURLCallback exists": function() {
                assert.include(serviceManager.serviceMap().installed, "testURLCallback");
                assert.isTrue(serviceManager.isInstalled("testURLCallback"));
            },
            "manifest data is taken over me.json data" : function() {
                assert.equal(serviceManager.serviceMap().installed["event-collector"].events[0][0], "configuration/listener");
            },
            "and can be spawned" : {
                topic:function() {
                    var promise = new events.EventEmitter();
                    var started = false;
                    serviceManager.spawn("testURLCallback", function() {
                        started = true;
                    });
                    setTimeout(function() {
                        if (started) {
                            promise.emit("success", true);
                        } else {
                            promise.emit("error", false);
                        }
                    }, 500);
                    return promise;
                },
                "successfully" : function(err, stat) {
                    assert.isNull(err);
                    assert.isTrue(stat);
                },
                "and can be shut down" : {
                    topic: function() {
                        var promise = new events.EventEmitter();
                        var shutdownComplete = false;
                        serviceManager.shutdown(function() {
                            shutdownComplete = true;
                        });
                        setTimeout(function() {
                            if (shutdownComplete) promise.emit("success", true);
                            else promise.emit("error", false);
                        }, 1000);
                        return promise;
                    },
                    "successfully" : function (err, stat) {
                        assert.isNull(err);
                        assert.isTrue(stat);
                    }
                }
            }
        }
    },
    "Available services" : {
        "gathered from the filesystem" : {
            topic:serviceManager.scanDirectory("Connectors"),
            "found at least 10 services": function() {
                assert.ok(serviceManager.serviceMap().available.length > 10);
            },
            "can be looked up by handle from the available sections of the service map": function() {
                assert.equal(serviceManager.getFromAvailable("facebook").handle, "facebook");
            },
            "and can be installed" : {
                topic:serviceManager.install({srcdir:"Connectors/Twitter"}),
                "by giving a valid install instance" : function(svcMetaInfo) {
                    assert.include(svcMetaInfo, "id");
                },
                "setting a version number" : function(svcMetaInfo) {
                    assert.notEqual(svcMetaInfo.version, undefined);
                },
                "and by service map says it is installed" : function(svcMetaInfo) {
                    assert.isTrue(serviceManager.isInstalled(svcMetaInfo.id));
                },
                "and by creating a valid service instance directory" : function(svcMetaInfo) {
                    statInfo = fs.statSync(lconfig.me + "/" + svcMetaInfo.id);
                },
                "and passes along the icon": function(svcMetaInfo) {
                    assert.notEqual(svcMetaInfo.icon, undefined);
                }
            }
        }
    },
    "Services marked as \"autoInstall\"": {
        "are installed automatically": function() {
            assert.includes(serviceManager.serviceMap().installed, "contactsviewer");
        }
    },
    "Collections" : {
        "are preinstalled" : function() {
            assert.includes(serviceManager.serviceMap().installed, "contacts");
        },
        topic:serviceManager.install({srcdir:"Collections/Contacts"}),
        "are not installable" : function(svcInfo) {
            assert.isUndefined(svcInfo);
        },
        "do not install stub collections" : function() {
            assert.isFalse(serviceManager.isInstalled("videos"));
        },
        "have event listeners defined via config files" : function() {
            var listeners = levents.displayListeners('configuration/listener');
            assert.equal(listeners[0].id, 'event-collector');
            assert.equal(listeners[0].cb, '/event');
        }
    },
    "Migrates services that need it during the install" : {
        topic: [],
        "changing their version" : function(topic) {
            assert.isTrue(serviceManager.isInstalled("migration-test"));
            assert.equal(serviceManager.serviceMap().installed['migration-test'].version, 1308079085972);
        },
        "and running the migration successfully" : function(topic) {
            var me = JSON.parse(fs.readFileSync(process.cwd() + "/" + lconfig.me + "/migration-test/me.json", 'ascii'));
            assert.notEqual(me.mongoCollections, undefined);
            assert.equal(me.mongoCollections[0], 'new_collection');
        }
    }
}).addBatch({
    "Spawning a service": {
        topic : function() {
            request({url:lconfig.lockerBase + '/Me/echo-config/'}, this.callback);
        },
        "passes the externalBase with the process info": function(err, resp, body) {
            var json = JSON.parse(body);
            assert.equal(json.externalBase, lconfig.externalBase + '/Me/echo-config/');
        }
    }
}).addBatch({
    "Disabling services " : {
        "that " : {
            topic: function() {
                request({url:lconfig.lockerBase + '/Me/disabletest/'}, this.callback);
            },
            "are already running" : function(err, resp, body) {
                assert.equal(resp.statusCode, 200);
                assert.equal(body, "ACTIVE");
            },
            "have mongo " : {
                topic : function() {
                    var self = this;
                    lmongo.init('disabletest', ['thing1','thing2'], function(theMongo, colls) {
                        mongo = theMongo;
                        colls.thing1.save({'one':1}, function(err, doc) {
                            colls.thing1.count(self.callback);
                        });
                    });
                },
                "collections" : function(err, result) {
                    assert.isNull(err);
                    assert.equal(result, 1);
                }
            },
            "are already running " : {
                topic : function() {
                    serviceManager.disable('disabletest');
                    var that = this;
                    request({uri:lconfig.lockerBase + '/core/tests/disable', json:{serviceId:'disabletest'}, method: 'POST'}, function(err, resp, body) {
                        request({url:lconfig.lockerBase + '/Me/disabletest/'}, that.callback);
                    })
                },
                "are stopped": function(err, resp, body) {
                    assert.equal(serviceManager.isInstalled('disabletest'), false);
                    assert.equal(resp.statusCode, 503);
                    assert.equal(body, "This service has been disabled.");
                }
            }
        }
    }
}).addBatch({
    "Reenabling services " : {
        topic: function() {
            serviceManager.enable('disabletest');
            var that = this;
            request({uri:lconfig.lockerBase + '/core/tests/enable', json:{serviceId:'disabletest'},method: 'POST'}, function(err, resp, body) {
                if (err) {
                    return that.callback(err, resp, body);
                }
                request({url:lconfig.lockerBase + '/Me/disabletest/'}, that.callback);
            })
        },
        "works properly": function(err, resp, body) {
            assert.equal(serviceManager.isInstalled('disabletest'), true);
            if (!resp) {
                console.dir(body);
                console.dir(resp);
                console.dir(err);
                if (err.message === 'socket hang up') {
                    console.error('i don\'t know man.  http://comments.gmane.org/gmane.comp.lang.javascript.nodejs/19987');
                }
            } else {
                assert.equal(resp.statusCode, 200);
                assert.equal(body, "ACTIVE");
            }
        }
    }
}).addBatch({
    "Uninstalling services " : {
        topic: function() {
            var that = this;
            request({uri:lconfig.lockerBase + '/core/tests/uninstall', json:{serviceId:'disabletest'}, method: 'POST'}, function() {
                path.exists(lconfig.me + "/disabletest", function(exists) {
                    if (exists) {
                        that.callback("directory still exists");
                    } else {
                        that.callback(false, true);
                    }
                })
            });
        },
        "deletes them FOREVER" : function(err, resp) {
            assert.isNull(err);
            assert.isTrue(resp);
        },
        "and deletes" : {
            topic : function() {
                mongo.collections.disabletest.thing1.count(this.callback);
            },
            "mongo collections" : function(err, doc) {
                assert.isNull(err);
                assert.equal(doc, 0);
            }
        }
    }
}).addBatch({
    "Disabled services " : {
        topic: function() {
            request({url:lconfig.lockerBase + '/Me/disabledtest/'}, this.callback);
        },
        "are disabled": function(err, resp, body) {
            assert.equal(resp.statusCode, 503);
            assert.equal(body, "This service has been disabled.");
        }
    }
}).export(module);

