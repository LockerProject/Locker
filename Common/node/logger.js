/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var lconfig = require("lconfig");
var winston = require("winston");
var events = require("events");
var util = require("util");

// Allow us to see the module for now
function ModuleConsoleLogger(args) {
    winston.transports.Console.call(this, args);
    this.name = "moduleConsole";
}
util.inherits(ModuleConsoleLogger, winston.transports.Console);
ModuleConsoleLogger.prototype.name = "moduleConsole";
ModuleConsoleLogger.prototype.doLog = ModuleConsoleLogger.prototype.log;
ModuleConsoleLogger.prototype.log = function(level, msg, meta, callback) {
    if (meta.module) {
        msg = "[" + meta.module + "] " + msg;
        meta = undefined;
    }

    this.doLog(level, msg, meta, callback);
}


var transports = [new ModuleConsoleLogger({colorize:true})];
if (lconfig.logFile) {
    transports.push(new (winston.transports.File)({filename:lconfig.logFile}));
}
exports["logger"] = new (winston.Logger)({"transports":transports});
