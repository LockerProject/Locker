/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var path = require("path");
var tw = require(path.join(lockerInterface.info.srcdir , "lib.js"));

tw.init(lockerInterface.info.auth);
tw.getMyFriends({}, function(friend) {
  lockerInterface.event(idr, "new", "contact", friend);
}, function(err) {
  if (err) {
    lockerInterface.error(err);
  }
  lockerInterface.end();
});
