
var assert = require('assert');
var vows = require('vows');
var RESTeasy = require('api-easy');
var lconfig = require('../Common/node/lconfig.js');

var suite = RESTeasy.describe('Github Connector');

var id = 'github-test';
lconfig.load('config.json');

suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss('can sync my profile with')
        .path('/Me/' + id + '/sync/profile')
        .get()
            .expect(200)
        .unpath()
    .undiscuss()
    .discuss('can sync my repos with')
        .path('/Me/' + id + '/sync/repos')
        .get()
            .expect(200)
        .unpath()
    .undiscuss();


suite.export(module);