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
var lconfig = require("lconfig");
lconfig.load("Config/config.json");
var RESTeasy = require('api-easy');
var socketIO = require("socket.io-client");
var events = require("events");

var socket;

var suite = RESTeasy.describe("UseUI");

suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Socket.IO")
    .path("/socket.io/?t=test")
        .get()
        .expect(200)
        .expect("returns it is ready", function(err, res, body) {
            assert.isNull(err);
            assert.equal(body, "Welcome to socket.io.");
        })
    .unpath()
    .undiscuss()

// This seems to race with the locker shutting down and is being disabled for now
//
suite.next().suite.addBatch({
    "Socket.IO": {
        topic:function() {
            var promise = new (events.EventEmitter);
            socket = socketIO.connect(lconfig.lockerBase);
            socket.on("error", function(error) {
                promise.emit('error', error);
            })
            socket.on("counts", function(counts) {
                promise.emit('success', counts);
            });
            setTimeout(function() {
                promise.emit('error', 'timeout');
            }, 10000);
            return promise;
        },
        "serves the counts on connect":function(err, counts) {
            assert.isNull(err);
            assert.isObject(counts);
        }
    }
});

suite.export(module);
