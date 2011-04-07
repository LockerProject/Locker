/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var plist = require("plist");

plist.parseFile("History.plist", function(err, obj) {
  if (err) {
    throw err;
  }

  console.log(JSON.stringify(obj));
});