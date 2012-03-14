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
  var host   = this.host
    , port   = this.port
    , prefix = this.prefix;

  if (!(host && port)) {
    logger.verbose("statsd dispatcher not configured, not dispatching '" + msg + "'");
    return;
  }

  if (prefix) msg = prefix + '.' + msg;
  var buf = new Buffer(msg);

  var socket = dgram.createSocket('udp4');
  socket.on('error', function (err) {
    logger.error('statsd event delivery error for ' + host + ': ' + err);
  });
  socket.send(buf, 0, buf.length, port, host, function (err, bytes) {
    if (err) logger.error('statsd send error: ' + err);

    socket.close();
  });
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
