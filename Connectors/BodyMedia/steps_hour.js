exports.sync = require('./lib').genericSync('steps',function(pi){
    if(!pi.config) pi.config = {};
    if(!pi.config.lastStep) pi.config.lastStep = Date.now()-(3600*1000*24*365); // default to a year ago
    // calculate date range for the past year
    var first = new Date(pi.config.lastStep);
    var second = new Date(pi.config.lastStep + (3600*1000*24*30)); // 30 days ahead, according to https://developer.bodymedia.com/docs/read/api_reference_v2/Step_Service
    return "step/day/hour/"+format(first)+"/"+format(second);
},function(pi, js){
    if(!js || !js.days) return [];
    pi.config.lastStep += (3600*1000*24*30); // for next run
    if(pi.config.lastStep > Date.now()) pi.config.lastStep = Date.now(); // we're not a time machine, *yet*
    return js.days;
});

function format(d)
{
    return ""+d.getFullYear()+((d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1))+((d.getDate() < 10 ? '0' : '') + d.getDate());
}