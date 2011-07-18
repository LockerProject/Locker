/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// this is a common pattern many connectors use, it processes the startup data and eventfully loads the auth.js, sync-api.js, etc
require.paths.push(__dirname);
require('connector/client').init({"enableCookies":true}, function(app, mongo) {
    var api = require('./api');
    api.init(mongo);
    app.get('/getDevices', api.getDevices);
});
