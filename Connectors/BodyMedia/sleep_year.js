exports.sync = require('./lib').genericSync('sleep',function(pi){
    // calculate date range for the past year
    var first = new Date(Date.now()-(3600*1000*24*365));
    var second = new Date();
    return "sleep/day/"+format(first)+"/"+format(second);
},function(pi, js){
    if(!js || !js.days) return [];
    if(!pi.config) pi.config = {};
    if(!pi.config.squeue) pi.config.squeue = [];
    if(!pi.config.sdone) pi.config.sdone = {};
    // any days that have lying down we push into a queue for the sleep_day synclet (unless they're flagged as done already)
    js.days.forEach(function(day){
        if(day.totalLying > 0 && !pi.config.sdone[day.date]) pi.config.squeue.push(day.date);
    });
    return js.days;
});

function format(d)
{
    return ""+d.getFullYear()+((d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1))+((d.getDate() < 10 ? '0' : '') + d.getDate());
}