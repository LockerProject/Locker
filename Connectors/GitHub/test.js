var fs = require('fs');
var auth = JSON.parse(fs.readFileSync("../../Me/github/me.json")).auth;
console.error(auth);

var sync = require(process.argv[2]);
sync.sync({auth:auth, lockerUrl:'http://localhost:8042'},function(e,js){
    console.error(e);
    console.error("got js:"+JSON.stringify(js));
});

