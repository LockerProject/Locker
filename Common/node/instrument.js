/*
 *
 * Copyright (C) 2012, The Locker Project
 * All rights reserved.
 *
 * Please see the LICENSE file for more information.
 *
 */
var dgram  = require('dgram')
  , logger = require('./logger.js');

function StatsdDispatcher(config) {
  this.host   = config.host;
  this.port   = config.port;
  this.prefix = config.prefix;
}

StatsdDispatcher.prototype.send = function (msg) {
  if (!this.host || !this.port) {
    logger.verbose("statsd dispatcher not configured, not dispatching '" + msg + "'");
    return;
  }
  if (this.prefix) msg = this.prefix + '.' + msg;

  var socket = dgram.createSocket('udp4');
  var buf = new Buffer(msg);
  try {
    socket.send(buf, 0, buf.length, this.port, this.host, function (err, bytes) {
      if (err) logger.error('statsd error: ' + err);

      socket.close();
    });
  } catch (err) {
    logger.error('statsd exception: ' + err);
  }
};

StatsdDispatcher.prototype.increment = function (key, value, rate) {
  this.send(key + ':' + (value ? value : 1) + '|c' + (rate ? ('|@' + rate) : ''));
};

StatsdDispatcher.prototype.decrement = function (key, value, rate) {
  this.send(key + ':' + (value ? value : -1) + '|c' + (rate ? ('|@' + rate) : ''));
};

StatsdDispatcher.prototype.timing = function (key, value, rate) {
  this.send(key + ':' + value + '|ms' + (rate ? ('|@' + rate) : ''));
};

exports.StatsdDispatcher = StatsdDispatcher;
