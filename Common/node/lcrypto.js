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
var lconfig = require('lconfig');
var logger = require('logger');

var idKey,idKeyPub,symKey;
var openssl;

exports.generateSymKey = function(cb) {
    path.exists(lconfig.me + "/symKey", function(exists) {
        if (exists) {
            symKey = fs.readFileSync(lconfig.me + "/symKey", "utf8");
            cb(true);
        } else {
            openssl = spawn("openssl", ["rand", "-out", lconfig.me + "/symKey", "24"]);
            openssl.on("exit", function(code) {
                var ret = true;
                if (code !== 0) {
                    ret = false;
                    logger.error("could not generate a symmetric key");
                } else {
                    symKey = fs.readFileSync(lconfig.me + "/symKey", "utf8");
                }
                cb(ret);
            });
        }
    });
}

// load up private key or create if none, just KISS for now
exports.loadKeys = function(callback) {
    if(!(symKey && idKey && idKeyPub)) {
        path.exists(__dirname + "/../../" + lconfig.me + "/symKey", function(exists) {
            if (exists === true)
                symKey = fs.readFileSync(__dirname + "/../../" + lconfig.me + "/symKey", "utf8");
            path.exists(__dirname + "/../../" + lconfig.me + "/key", function(exists) {
                if (exists === true)
                    idKey = fs.readFileSync(__dirname + '/../../' + lconfig.me + '/key','utf8');
                path.exists(__dirname + "/../../" + lconfig.me + "/key.pub", function(exists) {
                    if (exists === true)
                        idKeyPub = fs.readFileSync(__dirname + '/../../' + lconfig.me + '/key.pub','utf8');
                    if(typeof callback === 'function')
                        callback();
                });
            });
        });
    } else if(typeof callback === 'function') {
        process.nextTick(callback);
    }
}

exports.generatePKKeys = function(cb) {
    path.exists(lconfig.me + '/key',function(exists){
        if(exists) {
            exports.loadKeys();
            cb(true);
        } else {
            openssl = spawn('openssl', ['genrsa', '-out', 'key', '1024'], {cwd: lconfig.me});
            logger.info('generating id private key');
    //        openssl.stdout.on('data',function (data){logger.log(data);});
    //        openssl.stderr.on('data',function (data){logger.log('Error:'+data);});
            openssl.on('exit', function (code) {
                logger.info('generating id public key');
                openssl = spawn('openssl', ['rsa', '-pubout', '-in', 'key', '-out', 'key.pub'], {cwd: lconfig.me});
                openssl.on('exit', function (code) {
                    var ret = true;
                    if (code !== 0) {
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

exports.pubkey = function()
{
    return idKeyPub;
}

exports.encrypt = function(data) {
    if (!data) {
        logger.error("Error encrypting " + data);
        return "";
    }
    var cipher = crypto.createCipher("aes192", symKey);
    var ret = cipher.update(data, "utf8", "hex");
    ret += cipher.final("hex");
    return ret;
}

exports.decrypt = function(data) {
    if (!data) {
        logger.error("Error encrypting " + data);
        return "";
    }
    var cipher = crypto.createDecipher("aes192", symKey);
    var ret = cipher.update(data, "hex", "utf8");
    ret += cipher.final("utf8");
    return ret;
}

exports.sign = function(data) {
    if (!data) {
        logger.error("Error signing " + data);
        return false;
    }
    var signer = crypto.createSign("RSA-SHA256");
    signer.update(data, "utf8");
    return signer.sign(idKey, 'base64');
}

exports.verify = function(data, sig, keys) {
    if (!data || !sig || !keys || !Array.isArray(keys)) return false;
    var ret = false;
    keys.forEach(function(key){
        var verifier = crypto.createVerify("RSA-SHA256");
        verifier.update(data, "utf8");
        if(verifier.verify(key, sig, 'base64')) ret = true;
    });
    return ret;
}
