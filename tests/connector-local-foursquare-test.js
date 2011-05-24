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

var suite = RESTeasy.describe("Foursquare Connector")

var svcId = "foursquare-test";

lconfig.load('config.json');

var mePath = '/Me/' + svcId;

suite.use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Foursquare connector")
        .discuss("all contacts")
            .path(mePath + "/allContacts")
            .get()
                .expect('returns contacts', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 1);
                })
            .unpath()
        .undiscuss()
        .discuss("all current friends")
            .path(mePath + "/getCurrent/friends")
            .get()
                .expect('returns contacts', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 1); 
                })
            .unpath()
        .undiscuss()
        .discuss("all friends")
            .path(mePath + "/getAll/friends")
            .get()
                .expect('returns contacts', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 1); 
                })
            .unpath()
        .undiscuss()
        .discuss("all places")
            .path(mePath + "/getAll/places")
            .get()
                .expect('returns checkins', function(err, res, body) {
                    assert.isNull(err);
                    var checkins = JSON.parse(body);
                    assert.isNotNull(checkins);
                    assert.equal(checkins.length, 251); 
                })
            .unpath()
        .undiscuss()
        .discuss("friends since recordID 1")
            .path(mePath + "/getSince/friends?recordID=1")
            .get()
                .expect('returns contacts', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 1); 
                })
            .unpath()
        .undiscuss()
        .discuss("places since recordID 1")
            .path(mePath + "/getSince/places?recordID=1")
            .get()
                .expect('returns checkins', function(err, res, body) {
                    assert.isNull(err);
                    var checkins = JSON.parse(body);
                    assert.isNotNull(checkins);
                    assert.equal(checkins.length, 249); 
                })
            .unpath()
        .undiscuss()
        .discuss("get profile")
            .path(mePath + "/getCurrent/profile")
            .get()
                .expect("returns the user's profile", function(err, res, body) {
                    assert.isNull(err);
                    var profile = JSON.parse(body);
                    assert.isNotNull(profile);
                    assert.equal(profile.id, "18514"); 
                })
            .unpath()
        .undiscuss()      
        
suite.export(module);
