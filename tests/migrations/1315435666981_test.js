var path = require('path')
  , fs = require('fs')
  ;

module.exports = function(lconfig) {
    var state = fs.readFileSync(path.join(lconfig.lockerDir, lconfig.me, "state.json"));
    state = JSON.parse(state);
    state.migrated = true;
    fs.writeFileSync(path.join(lconfig.lockerDir, lconfig.me, "state.json"), JSON.stringify(state));
    return true;
};
