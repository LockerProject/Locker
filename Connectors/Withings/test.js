var fs = require('fs');
var auth = JSON.parse(fs.readFileSync("../../Me/withings/me.json")).auth;

console.error('auth', auth);

var sync = require(process.argv[2]);

sync.sync({ auth: auth }, function(e, js){
  console.error('error', e);

  console.error("got js", JSON.stringify(js));
});
