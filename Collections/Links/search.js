var clucene = require('clucene').CLucene;
var lucene = new clucene.Lucene();
var path = require('path');
var fs = require('fs');
var async = require("async");
var logger = require(__dirname + "/../../Common/node/logger").logger;
var wrench = require("wrench");

// constants, graciously lifted from lsearch
var EStore = {
  STORE_YES: 1,
  STORE_NO: 2,
  STORE_COMPRESS: 4
};

var EIndex = {
  INDEX_NO: 16,
  INDEX_TOKENIZED: 32,
  INDEX_UNTOKENIZED: 64,
  INDEX_NONORMS: 128,
};

var indexPath, dataStore;
// tracks the dStore and makes sure index dir exists 
exports.init = function(dStore)
{
    dataStore = dStore;
    indexPath = process.cwd() + "/links.index";
    if (!path.existsSync(indexPath)) {
      fs.mkdirSync(indexPath, 0755);
    };
}

exports.resetIndex = function() 
{
    try {
        wrench.rmdirSyncRecursive(indexPath);
    } catch (E) {
        // Ignoring if the dir does not exist
    }
}

// basically just raw full lucene results
exports.search = function(q, callback){
    lucene.search(indexPath, "content:("+q+")",function(err, res, time){
        if(err) return callback(err);
        callback(null, res);
//        res = res.sort(function(a,b){return b.at < a.at});
    });
}

// trigger a re-index of a link, get it and all it's encounters and smush them into some text
exports.index = function(linkUrl, callback){
    var link;
    dataStore.getLinks({link:linkUrl},
        function(l) { link=l },
        function(err){
            if(err) return callback(err);
            if (!link) {
                logger.debug("No url was found for " + linkUrl);
                return callback(err);
            }
            var at=0;
            // array of all text parts, start with important link stuff
            var parts = [linkUrl];
            if (link.title) parts.push(link.title);
            dataStore.getEncounters({link:linkUrl},
                function(e){
                    // track newest for sorting timestamp
                    if(e.at > at) at = e.at;
                    // add text parts of each encounter, except via
                    for(var a in e){if(a != "via" && a != "_hash") parts.push(e[a])};
                },
                function(err){
                    if(err) return callback(err);
                    parts.push(link.text); // add raw text at the end, lower score in lucene?
                    //ndx(linkUrl,at.toString(),parts.join(" <> ")); // does this break apart tokenization?
                    indexQueue.push({url:linkUrl, "at":at.toString(), txt:parts.join(" <> ")},callback);
                }
            );
        }
    );
}

var indexQueue = async.queue(function(task, callback) {
//    logger.debug("NDX "+task.url+" at "+task.at+" of "+task.txt);
    var doc = new clucene.Document();
    doc.addField("at", task.at, EStore.STORE_YES|EIndex.INDEX_UNTOKENIZED);
    doc.addField('content', task.txt, EStore.STORE_NO|EIndex.INDEX_TOKENIZED);
    console.log("Going to add " + task.url);
    lucene.addDocument(task.url, doc, indexPath, function(err, indexTime) {
        if (err) console.error(err);
        console.log("Added " + task.url);
        callback(err);
    });
    
    /*
    ndx(task.url, task.at, task.txt, function(err, indexTime, docsReplacedCount) {
        console.log("index queue callback");
        callback();
    });
    */
}, 1);

// raw indexing lucene wrapper
function ndx(id,at,txt,cb)
{
    logger.debug("NDX "+id+" at "+at+" of "+txt);
    var doc = new clucene.Document();
    doc.addField("at", at, EStore.STORE_YES|EIndex.INDEX_UNTOKENIZED);
    doc.addField('content', txt, EStore.STORE_NO|EIndex.INDEX_TOKENIZED);
    lucene.addDocument(id, doc, indexPath, function(err, indexTime) {
        console.log("NDX DONE");
        cb(err, indexTime);
    });
}    

