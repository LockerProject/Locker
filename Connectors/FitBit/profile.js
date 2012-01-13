/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

exports.sync = require('./lib').genericSync(function(pi){
    return 'profile.json';
}, function(pi, data){
    if(!pi.config) pi.config = {};
    pi.config.memberSince = data.user.memberSince; // used by activity
    return {profile:[data.user]};
});
