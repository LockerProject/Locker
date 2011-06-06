/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var assert = require('assert');
var vows = require('vows');
var RESTeasy = require('api-easy');
var lconfig = require('../Common/node/lconfig.js');

var svcId = "github-test";

var suite = RESTeasy.describe('Github Connector');

lconfig.load('config.json');

var fs = require('fs');
var lfs = require('../Common/node/lfs.js')

var mePath = '/Me/' + svcId;

var profile = fs.readFileSync('Me.tests/' + svcId + '/profile.json');
var reposStr = fs.readFileSync('Me.tests/' + svcId + '/repos.json').toString().split('\n');

var repos = [];
for(var i in reposStr) {
    if(reposStr[i])
        repos.push(JSON.parse(reposStr[i]));
}


suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss('can sync my profile with')
        .path('/Me/' + svcId + '/sync/profile')
        .get()
            .expect(404)
        .unpath()
    .undiscuss()
    .discuss('can sync my repos with')
        .path('/Me/' + svcId + '/sync/repos')
        .get()
            .expect(404)
        .unpath()
    .undiscuss()
    .discuss("can get profile with")
        .path(mePath + "/get_profile")
        .get()
            .expect(200)
            .expect('it matches the test data', function(err, resp, body) {
                assert.equal(profile, body);
            })
        .unpath()
    .undiscuss()
    .discuss("can get repos with")
        .path(mePath + "/get/repos")
        .get()
            .expect(200)
            .expect('it matches the test data', function(err, resp, body) {
                assert.equal(JSON.stringify(repos), body);
            })
        .unpath()
    .undiscuss();
    
suite.export(module);


