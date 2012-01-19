/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

exports.sync = require('./lib').genericSync(function(pi){
    return 'devices.json';
}, function(pi, data){
    if(!pi.config) pi.config = {};
    pi.config.lastSyncTime = data[0].lastSyncTime;
    return {device:data};
});
