/* 
* Collection of tests for issues on the tracker
*/

var assert = require("assert");
var vows = require("vows");
var RESTeasy = require("rest-easy");
var http = require("http");
var request = require('request');
var querystring = require("querystring");
var events = require("events");
var fs = require("fs");


var tests = RESTeasy.describe("Locker Core Issues")

tests.use("localhost", 8042);

tests.discuss("Issues #15 - Services do not spawn when called through the proxy")
    // Two of these at once to test the error of the process stopping with multiple pending callbacks
    .get("/Me/slowStarter/firstPass")
        .expect(200)
    .post("/Me/slowStarter/firstPass")
        .expect(200)
    .next()
        // Now we make sure the startup callback list was cleared from the previous step
        .get("/Me/slowStarter/another")
            .expect(200)
        .get("/Me/slowStarter/more")
            .expect(200)
.undiscuss();

tests.export(module);
