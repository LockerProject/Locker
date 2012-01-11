var path = require('path');
var fs = require('fs');
var request = require('request');
var lconfig = require(path.join(__dirname, "../Common/node/lconfig.js"));
lconfig.load(path.join(__dirname, "../Config/config.json"));

if(!path.exists("./package.json"))
{
    console.error("missing ./package.json?");
    process.exit(1);
}

// TODO path diff to get proper base
request.post({url:lconfig.lockerBase+'/map/upsert?manifest=Me/github/'+manifest+'&type=install'}, function(err, resp) {
});