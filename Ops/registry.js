/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/*

available - all possible apps
installed - installed apps
install - npm install into Me/node_modules
publish - take meta-data + folder, create/update package.json (new version)
        if no auth, generate Me/registry.auth from keys
        use auth and publish new version

on startup
    scan Me/node_modules/X/package.json for all installed
    load cached available from Me/registry.json
        kick off process to look for newer
            merge in and re-write registry.json
            if newer of installed and update=auto, npm update
    schedule periodic update checks
*/

exports.init = function() {
};

