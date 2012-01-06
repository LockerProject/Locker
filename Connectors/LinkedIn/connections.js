exports.sync = require('./lib').genericSync('connection', function(pi){
    return "people/~/connections";
},function(pi, js){
    return js.values;
});