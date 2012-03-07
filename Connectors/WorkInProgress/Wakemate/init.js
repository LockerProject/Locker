// this is a common pattern many connectors use, it processes the startup data and eventfully loads the auth.js, sync-api.js, etc
require.paths.push(__dirname);
// https://github.com/LockerProject/Locker/wiki/Create-a-new-connector talks about the various options that can be passed here when using the common client code
require('connector/client').init();