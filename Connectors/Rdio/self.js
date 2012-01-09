/*
 *
 * Copyright (C) 2012, The Locker Project
 * All rights reserved.
 *
 * Please see the LICENSE file for more information.
 *
 */

var rdio = require('./lib.js');
var self = {};

exports.sync = function (processInfo, cb) {
    rdio.getSelf(processInfo, cb);
}