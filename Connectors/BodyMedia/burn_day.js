exports.sync = require('./lib').genericSync('minutes', function(pi){
    if(!pi.config || !pi.config.queue || pi.config.queue.length == 0) return null;
    return "burn/day/minute/intensity/"+pi.config.queue[0];
},function(pi, js){
    if(!js || !js.days) return [];
    if(!pi.config.done) pi.config.done = {};
    pi.config.done[pi.config.queue.shift()] = true; // same date from queue as above
    if(pi.config.queue.length > 0) pi.config.nextRun = -1;
    return js.days;
});