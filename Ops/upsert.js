var path = require('path');
var fs = require('fs');
var request = require('request');
var lconfig = require(path.join(__dirname, "../Common/node/lconfig.js"));
lconfig.load(path.join(__dirname, "../Config/config.json"));

try {
    var js = JSON.parse(fs.readFileSync('./package.json'));
} catch(e) {
    console.error("missing or invalid ./package.json?");
    process.exit(1);

}
var base = path.dirname(__dirname) + "/"; // parent of Ops and trailing slash
var full = path.join(process.argv[2] || process.cwd(),"package.json");
var local = full.replace(base, "");
console.log("upserting "+local);
request.post({url:lconfig.lockerBase+'/map/upsert?manifest='+local}, function(err, resp) {
    if(err){
        console.error(err);
        process.exit(1);
    }
    console.log("done!");
    process.exit(0);
});
