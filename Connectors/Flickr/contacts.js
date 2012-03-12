/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var path = require("path");

var PER_PAGE = 1000;
exports.sync = function(processInfo, callback) {
  var paging = require(path.join(processInfo.absoluteSrcdir, 'lib', 'paging.js'));
  paging.getPage(processInfo, 'flickr.contacts.getList', 'contact', PER_PAGE, {}, function(config, contactsArray) {
    for(var i in contactsArray) {
      contactsArray[i] = {obj:contactsArray[i], timestamp:config.lastUpdate, type:'new'};
    }
    callback(null, {config: config, data: {contact:contactsArray}});
  });
}
