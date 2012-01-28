exports.sync = require('./lib').genericSync('periods', function(pi){
    if(!pi.config || !pi.config.squeue || pi.config.squeue.length == 0) return null;
    return "sleep/day/period/"+pi.config.squeue[0];
},function(pi, js){
    if(!js || !js.days) return [];
    if(!pi.config.sdone) pi.config.sdone = {};
    pi.config.sdone[pi.config.squeue.shift()] = true; // same date from queue as above
    if(pi.config.squeue.length > 0) pi.config.nextRun = -1;
    return js.days;
});