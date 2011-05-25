/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
//testing for the Foursquare connector

var RESTeasy = require('api-easy');
var lconfig = require('../Common/node/lconfig.js')
var assert = require('assert');

var suite = RESTeasy.describe("Twitter Connector")

var svcId = "twitter-test";

lconfig.load('config.json');

var mePath = '/Me/' + svcId;

suite.use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Twitter connector")
        .discuss("all current friends")
            .path(mePath + "/getCurrent/friends")
            .get()
                .expect('returns nothing', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 0); 
                })
            .unpath()
        .undiscuss()
        .discuss("all current followers")
            .path(mePath + "/getCurrent/followers")
            .get()
                .expect('returns one follower', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 1);
                    assert.equal(contacts[0].id, 1054551);
                })
            .unpath()
        .undiscuss()
        .discuss("all friends")
            .path(mePath + "/getAll/friends")
            .get()
                .expect('returns friends', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 2); 
                    assert.equal(contacts[0].id, 1054551);
                    assert.equal(contacts[1].id, 1054551);
                    assert.equal(contacts[1].deleted, 1306354042558);
                })
            .unpath()
        .undiscuss()
        .discuss("all followers")
            .path(mePath + "/getAll/followers")
            .get()
                .expect('returns contacts', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 1); 
                })
            .unpath()
        .undiscuss()
        .discuss("all home_timeline updates")
            .path(mePath + "/getAll/home_timeline")
            .get()
                .expect('returns status updates', function(err, res, body) {
                    assert.isNull(err);
                    var statuses = JSON.parse(body);
                    assert.isNotNull(statuses);
                    assert.equal(statuses.length, 1); 
                    assert.equal(statuses[0].id, 71348168469643260);
                })
            .unpath()
        .undiscuss()
        .discuss("all mentions updates")
            .path(mePath + "/getAll/mentions")
            .get()
                .expect('returns status updates', function(err, res, body) {
                    assert.isNull(err);
                    var statuses = JSON.parse(body);
                    assert.isNotNull(statuses);
                    assert.equal(statuses.length, 1); 
                    assert.equal(statuses[0].id, 73034804081344510);
                })
            .unpath()
        .undiscuss()
        .discuss("all user_timeline updates")
            .path(mePath + "/getAll/user_timeline")
            .get()
                .expect('returns status updates', function(err, res, body) {
                    assert.isNull(err);
                    var statuses = JSON.parse(body);
                    assert.isNotNull(statuses);
                    assert.equal(statuses.length, 1); 
                    assert.equal(statuses[0].id, 73036575310757890);
                })
            .unpath()
        .undiscuss()   
        
suite.export(module);
