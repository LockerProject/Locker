var fs = require('fs');
var pi = JSON.parse(fs.readFileSync("../../Me/zeo/me.json"));

var sync = require(process.argv[2]);

sync.sync(pi, function(e, js) {
  console.error('error', e);

  console.error("got js", JSON.stringify(js));
});
