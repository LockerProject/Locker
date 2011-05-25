/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
//testing for the Facebook connector

var RESTeasy = require('api-easy');
var lconfig = require('../Common/node/lconfig.js');
var assert = require('assert');

var suite = RESTeasy.describe("Facebook Connector");

var svcId = "facebook-test";

lconfig.load('config.json');

var mePath = '/Me/' + svcId;

suite.use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Facebook connector")
        .discuss("all contacts")
            .path(mePath + "/allContacts")
            .get()
                .expect('returns contacts', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 5);
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
                    assert.equal(contacts.length, 5); 
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
                    assert.equal(contacts.length, 5); 
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
                    assert.equal(contacts.length, 3); 
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
                    assert.equal(profile.id, "100002438955325"); 
                })
            .unpath()
        .undiscuss();      
        
suite.export(module);
