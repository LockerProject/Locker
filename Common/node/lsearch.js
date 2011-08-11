/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var lconfig = require('lconfig');
var cl = require('clucene').CLucene;

var lucene = new cl.Lucene();

exports.setEngine = function(engine) {
    
};

exports.addMapping = function(type, mapping) {
    
};

exports.indexType = function(type, value, callback) {
    var doc = new cl.Document();
    
    doc.addField('_id', value.id, 65); // TODO: replace these with the actual bitwise ops for readability
    doc.addField('content', value, 33);
    lucene.addDocument(doc, process.cwd() + '/' + lconfig.me + '/search.index', function(err, indexTime) {
        if (err) {
            console.log('Error adding: ' + err);
        }
        process.nextTick(processNext);
    });
};

exports.queryType = function(type, query, params, callback) {
    
    lucene.search("tweets.lucene", "content:(" + process.argv[2] + ")", function(err, results) {
        if (err) {
            console.log("Search error: " + err);
            return;
        }
        var objects = fs.readFileSync("user_timeline.json", "utf8").split("\n");
        objects = objects.map(function(objText) { 
            try {
                var json = JSON.parse(objText);
                return json;
            } catch(E) {
                return undefined;
            }
        }).filter(function(obj) { return obj !== undefined; });
        results.forEach(function(result) {
            var id = parseInt(result.id);
            objects.some(function(obj) {
                if (obj.data.id == id) {
                    console.log("score(" + result.score + ") " + obj.data.created_at + " - " + obj.data.text);
                    return true;
                } else {
                    return false;
                }

            });
        });
    });
};

exports.queryAll = function(query, params, callback) {
    
};