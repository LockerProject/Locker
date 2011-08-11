/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var path = require('path');
var spawn = require('child_process').spawn;
var fs = require('fs');
var lconfig = require('lconfig');
var cl = require('clucene').CLucene;

exports.setEngine = function(engine) {
    
};

exports.addMapping = function(type, mapping) {
    
};

exports.indexType = function(type, value, callback) {
    var doc = new cl.Document();
    
    doc.addField('_id', value.id, 65); // TODO: replace these with the actual bitwise ops for readability
    doc.addField('content', value, 33);
    lucene.addDocument(doc, process.cwd() + '/' + lconfig.me + '/' + search.index, function(err, indexTime) {
        if (err) {
            console.log('Error adding: ' + err);
        }
        process.nextTick(processNext);
    });
};

exports.queryType = function(type, query, params, callback) {
    
};

exports.queryAll = function(query, params, callback) {
    
};