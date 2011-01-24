var plist = require("plist");

plist.parseFile("History.plist", function(err, obj) {
  if (err) {
    throw err;
  }

  console.log(JSON.stringify(obj));
});