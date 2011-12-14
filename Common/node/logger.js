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
var path = require("path");

// Allow us to see the module for now
function ModuleConsoleLogger(args) {
    winston.transports.Console.call(this, args);
    this.name = "moduleConsole";
}
util.inherits(ModuleConsoleLogger, winston.transports.Console);
ModuleConsoleLogger.prototype.name = "moduleConsole";
ModuleConsoleLogger.prototype.doLog = ModuleConsoleLogger.prototype.log;
ModuleConsoleLogger.prototype.log = function(level, msg, meta, callback) {
    if (meta && meta.module) {
        msg = "[" + meta.module + "] " + msg;
        delete meta.module;
        if (meta == {}) meta = undefined;
    }

    this.doLog(level, msg, meta, callback);
}

// This is a copy of the normal file logger so that we can work around a winston bug that spews warnings on too many listeners
function FileBugLogger(options) {
	winston.transports.File.call(this, options);
	this.name = "fileBug";
}
util.inherits(FileBugLogger, winston.transports.File);
FileBugLogger.prototype.name = "fileBug";
FileBugLogger.prototype._realOpen = FileBugLogger.prototype.open;
FileBugLogger.prototype.open = function(cb) {
	this._realOpen(cb);
	if (this.stream) this.stream.setMaxListeners(0);
};

var transports = [];
if (lconfig.logging.console)
    transports.push(new ModuleConsoleLogger({level:lconfig.logging.level, colorize:true,timestamp:true}));
if (lconfig.logging.file) {
    var fileLogger = new FileBugLogger({
        filename:path.join(lconfig.lockerDir, "Logs", lconfig.logging.file),
        timestamp:true,
        maxsize:lconfig.logging.maxsize,
        level:lconfig.logging.level
    });
    fileLogger.on("open", function() {
        var realWrite = fileLogger.stream.write;
        fileLogger.stream.write = function(data) {
            if (!fileLogger.stream.writable) {
                console.error("Could not write ", data);
            } else {
                realWrite.call(fileLogger.stream, data, "utf8");
            }
        }
    });
    transports.push(fileLogger);
}

module.exports = new (winston.Logger)({"transports":transports});
var realLog = exports.log;
exports.log = function(level, msg) {
    try {
        realLog.call(module.exports, level, msg.toString('utf8'));
    } catch (E) {
        realLog.call(module.logger, level, msg);
    }
}
