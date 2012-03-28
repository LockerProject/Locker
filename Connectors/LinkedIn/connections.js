exports.sync = require('./lib').genericSync('connection', function(pi){
    if (!pi.config.connStart) {
        pi.config.connStart = 0;
        return "people/~/connections?format=json";
    } else {
        return "people/~/connections?start=" + pi.config.connStart + "&format=json";
    }
},function(pi, js){
    if (!js || !js.values) {
        pi.config.connStart = 0;
        return [];
    }
    if (js.values.length < 500) {
        pi.config.connStart = 0;
    } else {
        pi.config.connStart += 500;
    }
    return js.values;
});
