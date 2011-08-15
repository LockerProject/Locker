/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/


/*
* Indexed JSON On Disk
*/

var fs = require('fs'),
    lconfig = require('lconfig')
    lfs = require(__dirname + '/lfs');

function IJOD(name, dir) {
    this.name = name;
    this.dataFileName = name + '.json';
    if (dir) {
        this.dataFile = fs.openSync(process.cwd() + "/" + lconfig.me + "/synclets/" + dir + "/" + this.dataFileName, 'a');
    } else {
        this.dataFile = fs.openSync(this.dataFileName, 'a');
    }
}

exports.IJOD = IJOD;

IJOD.prototype.addRecord = function(timeStamp, record, callback) {
    var str = JSON.stringify({timeStamp:timeStamp, data:record}) + '\n';
    var b = new Buffer(str);
    fs.write(this.dataFile, b, 0, b.length, this.fileLength, callback);
}