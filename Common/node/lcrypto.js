/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var crypto = require("crypto");
var path = require("path");
var spawn = require("child_process").spawn;
var fs = require("fs");

var idKey,idKeyPub,symKey;

exports.generateSymKey = function(cb) {
    path.exists("Me/symKey", function(exists) {
        if (exists) {
            symKey = fs.readFileSync("Me/symKey", "utf8");
            cb(true);
        } else {
            var openssl = spawn("openssl", ["rand", "-out", "Me/symKey", "24"]);
            openssl.on("exit", function(code) {
                var ret = true;
                if (code != 0) {
                    ret = false;
                    console.error("could not generate a symmetric key");
                } else {
                    symKey = fs.readFileSync("Me/symKey", "utf8");
                }
                cb(ret);
            });
        }
    });
}

// load up private key or create if none, just KISS for now
exports.loadKeys = function() {
    path.exists(__dirname + "/../../Me/symKey", function(exists) {
        if (exists === true) {  
            symKey = fs.readFileSync(__dirname + "/../../Me/symKey", "utf8");
        }
    });
    path.exists(__dirname + "/../../Me/key", function(exists) {
        if (exists === true) {  
            idKey = fs.readFileSync(__dirname + '/../../Me/key','utf-8');
        }
    });
    path.exists(__dirname + "/../../Me/key.pub", function(exists) {
        if (exists === true) {  
            idKeyPub = fs.readFileSync(__dirname + '/../../Me/key.pub','utf-8');
        }
    });
}

exports.generatePKKeys = function(cb) {
    path.exists('Me/key',function(exists){
        if(exists) {
            exports.loadKeys();
            cb(true);
        } else {
            openssl = spawn('openssl', ['genrsa', '-out', 'key', '1024'], {cwd: 'Me'});
            console.log('generating id private key');
    //        openssl.stdout.on('data',function (data){console.log(data);});
    //        openssl.stderr.on('data',function (data){console.log('Error:'+data);});
            openssl.on('exit', function (code) {
                console.log('generating id public key');
                openssl = spawn('openssl', ['rsa', '-pubout', '-in', 'key', '-out', 'key.pub'], {cwd: 'Me'});
                openssl.on('exit', function (code) {
                    var ret = true;
                    if (code != 0) {
                        ret = false;
                    } else {
                        exports.loadKeys();
                    }
                    cb(ret);
                });
            });
        }
    });
}

exports.encrypt = function(data) {
    if (!data) {
        console.warn("Error encrypting " + data);
        return "";
    }
    var cipher = crypto.createCipher("aes192", symKey);
    var ret = cipher.update(data, "utf8", "hex");
    ret += cipher.final("hex");
    return ret;
}

exports.decrypt = function(data) {
    if (!data) {
        console.warn("Error encrypting " + data);
        return "";
    }
    var cipher = crypto.createDecipher("aes192", symKey);
    var ret = cipher.update(data, "hex", "utf8");
    ret += cipher.final("utf8");
    return ret;
}
