var assert = require("assert");
var ltest = require("ltest");
var sm = require("lservicemanager");
var fs = require("fs");
var rimraf = require("rimraf");

ltest.Test("Service manager gathers all available services", function() {
    sm.scanDirectory("services");
    assert.equal(sm.serviceMap().available.length, 3);
});

ltest.Test("Service manager gathers existing services", function() {
    sm.findInstalled();
    assert.ok(sm.serviceMap().installed["b2f70807a270e0de8a0a4709b1f260af"]);
});

ltest.Test("Service manager can install a service", function() {
    var installedData = sm.install({"testField":"value"});
    var statInfo = fs.statSync("Me/" + installedData.id);
    var meInfo = fs.statSync("Me/" + installedData.id + "/me.json");
    assert.ok(statInfo.isDirectory() && meInfo.isFile());
    rimraf.sync("Me/" + installedData.id);
});

ltest.Test("Service manager can return service information by id", function() {
    var metaData = sm.metaInfo("b2f70807a270e0de8a0a4709b1f260af");
    assert.equal(metaData.id, "b2f70807a270e0de8a0a4709b1f260af");
});

ltest.Test("Service manager can spawn a service instance", function(test) {
    sm.spawn("b2f70807a270e0de8a0a4709b1f260af", function() {
        test.emit("success", test);
    });
    setTimeout(function() {
        test.emit("fail", test, "Did not spawn service");
    }, 1000);
}).async();

ltest.Test("Service manager correctly performs a shutdown", function(test) {
    sm.shutdown(function() {
        test.emit("success", test);
    });
    setTimeout(function() {
        test.emit("fail", test, "Did not shutdown properly");
    }, 1000);
}).async();

