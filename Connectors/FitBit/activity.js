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
    if(!pi.config.memberSince || !pi.config.lastSyncTime) return false;
    if(!pi.config.activeNext) pi.config.activeNext = (new Date(pi.config.memberSince).getTime()); // convert to epoch format
    if((pi.config.activeNext > new Date(pi.config.lastSyncTime).getTime())) return false; // don't run ahead of last sync
    return 'activities/date/'+format(pi.config.activeNext)+'.json';
}, function(pi, data){
    if(!data || !data.summary) return {};
    data.id = format(pi.config.activeNext); // stub in an id based on the date
    var next = pi.config.activeNext + (3600*1000*24); // next run get next day
    if(next < (new Date(pi.config.lastSyncTime).getTime())){
        pi.config.activeNext = next; // don't move forward past last sync time!
        if(pi.config.activeNext < Date.now()) pi.config.nextRun = -1; // force run again
    }
    return {active:[data]};
});

function format(epoch)
{
    d = new Date(epoch);
    return ""+d.getFullYear()+'-'+((d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1))+'-'+((d.getDate() < 10 ? '0' : '') + d.getDate());
}