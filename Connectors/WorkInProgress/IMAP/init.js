// this is a common pattern many connectors use, it processes the startup data and eventfully loads the auth.js, sync-api.js, etc
require.paths.push(__dirname);
require('connector/client').init();
