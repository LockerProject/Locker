/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var logger = require(__dirname + "/logger.js").logger;

console.baseColor = "\033[0m"; // white
console.errorColors = [/* yellow */"\033[33;40m", /* red */ "\033[31;40m"];
console.moduleColor = "\033[32;40m"; // green
console.realLog = console.log;

console.outputModule = "Locker";

/*
Number.prototype.zeroPad = function(width) {
    var n = Math.abs(this);
    var count = Math.max(0, width - Math.floor(n).toString().length);
    var zeroString = Math.pow(10, count).toString().substr(1);
    if (this < 0) zeroString = "-" + zeroString;
    return zeroString + n;
}

function paddedTimestamp()
{
    var now = new Date();
    return now.getHours().zeroPad(2) + ":" + now.getMinutes().zeroPad(2) + ":" + now.getSeconds().zeroPad(2);
}
console.logHeader = function(color)
{
    if (color) {
        return console.baseColor + "[" + paddedTimestamp() + "][" + console.moduleColor + console.outputModule + console.baseColor + "]";
    } else {
        return "[" + paddedTimestamp() + "][" + console.outputModule + "]";
    }
}
*/

console.log = function (msg)
{
    /*
    args = Array.prototype.slice.call(arguments);
    args[0] = console.logHeader() + " " + args[0];
    console.realLog.apply(this, args);
    */
    logger.log("info", msg, {"module":console.outputModule});
}

console.realWarn = console.warn;
console.warn = function(msg) 
{
    /*
    args = Array.prototype.slice.call(arguments);
    args[0] = console.logHeader() + "[" +  console.errorColors[0] + "WARNING" + console.baseColor + "] " + args[0];
    console.realWarn.apply(this, args);
    */
    logger.log("warn", msg, {"module":console.outputModule});
}

console.realError = console.error;
console.error = function(msg)
{
    /*
    args = Array.prototype.slice.call(arguments);
    args[0] = console.logHeader() + "[" +  console.errorColors[1] + "ERROR" + console.baseColor + "] " + console.errorColors[1] + args[0];
    console.realWarn.apply(this, args);
    */
    logger.log("error", msg, {"module":console.outputModule});
}
