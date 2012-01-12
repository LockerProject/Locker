/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

exports.sync = require('./lib').genericSync(function(pi){
    if(!pi.config) pi.config = {};
    if(!pi.config.memberSince) return false;
    if(!pi.config.activeNext) pi.config.activeNext = (new Date(pi.config.memberSince).getTime()); // convert to epoch format
    return 'activities/date/'+format(pi.config.activeNext)+'.json';
}, function(pi, data){
    if(!data || !data.summary) return {};
    pi.config.activeNext += (3600*1000*24); // next run get next day
    if(pi.config.activeNext < Date.now()) pi.config.nextRun = -1; // force run again
    return {device:data};
});

function format(epoch)
{
    d = new Date(epoch);
    return ""+d.getFullYear()+'-'+((d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1))+'-'+((d.getDate() < 10 ? '0' : '') + d.getDate());
}