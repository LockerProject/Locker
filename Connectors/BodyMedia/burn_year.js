exports.sync = require('./lib').genericSync('burn',function(pi){
    // calculate date range for the past year
    var first = new Date(Date.now()-(3600*1000*24*365));
    var second = new Date();
    return "burn/day/intensity/"+format(first)+"/"+format(second);
},function(pi, js){
    if(!js || !js.days) return [];
    if(!pi.config) pi.config = {};
    if(!pi.config.queue) pi.config.queue = [];
    if(!pi.config.done) pi.config.done = {};
    // any days that have calories we push into a queue for the burn_day synclet (unless they're flagged as done already)
    js.days.forEach(function(day){
        if(day.totalCalories > 0 && !pi.config.done[day.date]) pi.config.queue.push(day.date);
    });
    return js.days;
});

function format(d)
{
    return ""+d.getFullYear()+((d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1))+((d.getDate() < 10 ? '0' : '') + d.getDate());
}