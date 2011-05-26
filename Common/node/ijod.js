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
    lfs = require(__dirname + '/lfs');

function IJOD(name) {
    this.name = name;
    this.dataFileName = name + '.json';
    this.dataFile = fs.openSync(this.dataFileName, 'a');
}

exports.IJOD = IJOD;

IJOD.prototype.addRecord = function(_objectID, timeStamp, record, callback) {
    var str = JSON.stringify({timeStamp:timeStamp, data:record}) + '\n';
    var b = new Buffer(str);
    fs.write(this.dataFile, b, 0, b.length, this.fileLength, callback);
}