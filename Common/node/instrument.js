/*
 *
 * Copyright (C) 2012, The Locker Project
 * All rights reserved.
 *
 * Please see the LICENSE file for more information.
 *
 */
var dgram  = require('dgram')
  , util = require('util')
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
  
  // create closure; if there's an error, can report the problematic host/port
  f_ctx = this;
  var f = function () {with(f_ctx){ return [f_ctx.host, f_ctx.port, f_ctx.prefix];}}
  
  var socket = dgram.createSocket('udp4');
  var buf = new Buffer(msg);
  socket.send(buf, 0, buf.length, this.port, this.host, function (err, bytes) {
    if (err) {
      console.error('statsd error: %s --- %s', err, util.inspect(f()));
    }

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
