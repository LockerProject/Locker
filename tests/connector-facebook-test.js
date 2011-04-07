//testing for Facebook connector

var assert = require('assert');
var vows = require('vows');
var RESTeasy = require('rest-easy');
var http = require('http');
var querystring = require('querystring');
var events = require('events');
var fs = require('fs');
var request = require('request');
var lfs = require('../Common/node/lfs.js');
var locker = require('../Common/node/locker.js');
var path = require('path');

var suite = RESTeasy.describe('Facebook Connector')

var id = 'c2b28e92ebe576c5687ce1ce9d2f25c2';

//checks to ensure a list of paths all exist
function checkFiles(paths, callback) {
    if(!paths || paths.length == 0) {
        callback();
        return;
    } else {
        var path = paths.pop();
        fs.stat(path, function(err, stat) {
            if(err) {
                callback(err);
                return;
            } else {
                checkFiles(paths, callback);
            }
        });
    }
}

//retries, waiting for paths to exist
function waitForPathsToExist(paths, retries, timeout,  callback) {
    if(retries < 0) {
        callback(false);
        return;
    }
    setTimeout(function() {
        var files = [];
        for(var i in paths)
            files.push(paths[i]);
        
        checkFiles(files, function(err) {
            if(err) {
                waitForPathsToExist(paths, retries - 1, timeout,  callback);
                return;
            } else {
                callback(true);
                return;
            }
        })
    }, timeout);
}

//waits for a file to reach at least the expected size (in bytes), or returns false
function waitForFileToComplete(path, expectedSize, retries, timeout,  callback) {
    if(retries < 0) {
        callback(false);
        return;
    }
    setTimeout(function() {
        fs.stat(path, function(err, stat) {
            if(err || !stat || stat.size < expectedSize) {
                waitForFileToComplete(path, expectedSize, retries - 1, timeout, callback);
                return;
            } else {
                callback(true);
                return;
            }
        });
    }, timeout);
}


suite.next().suite.addBatch({
    'Facebook Connector can get friends from Facebook' : {
        topic:function() {
            var promise = new events.EventEmitter;
            
            request({uri:'http://localhost:8042/Me/' + id + '/friends'}, function(err, resp, body) {
                if(err) {
                    promise.emit('error', err);
                    return;
                }
                //TODO: file size might not be a great way to determine if a file is done
                waitForFileToComplete('../Me/' + id + '/contacts.json', 45, 10, 500, function(success) {
                    if(success == true)
                        promise.emit('success', true);
                    else
                        promise.emit('error', new Error);
                });
            });
            return promise;
        },
        'and returns within 5 seconds':function(err, stat) {
            assert.isNull(err);
        }
    }
});


suite.next().use('localhost', 8042)
    .discuss('Facebook connector')
        .discuss('can get all friends')
            .path('/Me/' + id + '/allContacts')
            .get()
                .expect(200)
                .expect('returns one friend', function(err, res, body) {
                    assert.isNull(err);
                    var friends = JSON.parse(body);
                    assert.equal(friends.length, 1);
                })
                .expect('returns Simon as only friend', function(err, res, body) {
                    assert.isNull(err);
                    var friends = JSON.parse(body);
                    assert.equal(friends[0].id, "5316709");
                })
            .unpath()
        .undiscuss()
    .undiscuss();

suite.next().suite.addBatch({
    'Facebook Connector can get photos from Facebook' : {
        topic:function() {
            var promise = new events.EventEmitter;
            
            request({uri:'http://localhost:8042/Me/' + id + '/photos'}, function(err, resp, body) {
                if(err) {
                    promise.emit('error', err);
                    return;
                }
                waitForPathsToExist(['../Me/' + id + '/photos/Me/105391012878112/105391016211445.jpg',
                                     '../Me/' + id + '/photos/Me/105399949543885/105400009543879.jpg',
                                     '../Me/' + id + '/photos/Me/105787999505080/105788059505074.jpg'],
                                    10, 1000, 
                    function(success) {
                        if(success)
                            promise.emit('success', true);
                        else
                            promise.emit('error', new Error);
                    }
                );
            });
            return promise;
        },
        'and returns within 5 seconds':function(err, stat) {
            assert.isNull(err);
        }
    }
});

var albums = [];
suite.next().use('localhost', 8042)
    .discuss('Facebook connector')
        .discuss('can get all photos')
            .path('/Me/' + id + '/allPhotos')
            .get()
                .expect(200)
                .expect('returns 3 albums', function(err, res, body) {
                    assert.isNull(err);
                    albums = JSON.parse(body);
                    assert.equal(albums.length, 3);
                })
            .unpath()
        .undiscuss()
    .undiscuss();   

suite.export(module);
