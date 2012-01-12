var fs = require('fs');
var auth = JSON.parse(fs.readFileSync("../../Me/fitbit/me.json")).auth;
console.error(auth);

var sync = require(process.argv[2]);
sync.sync({auth:auth,config:{memberSince:'2013-01-01'}},function(e,js){
    console.error(e);
    console.error("got js:"+JSON.stringify(js));
});

