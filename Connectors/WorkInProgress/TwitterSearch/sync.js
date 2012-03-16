var fs = require('fs');
var lfs = require('lfs.js');
var EventEmitter = require('events').EventEmitter;
var crypto = require("crypto");
var locker = require('locker.js');
var request = require('request');
var url = require('url');

exports.createClient = function(query,cb) {
    return new TSClient(query,cb);
}

// automatically load (or init) a search file for each 
function TSClient(query, cb) {
    this.search = {};
    this.search.q = query;
    this.search.since_id = 0;
    this.search.rcount = 0;
    var hash = crypto.createHash('md5');
    hash.update(query);
    this.search.id = hash.digest('hex');
    var self = this;
    lfs.readObjectFromFile(self.search.id+'.search', function(data) {
        if(data && data.id)
        {
            self.search = data;            
        }else{
            lfs.writeObjectToFile(self.search.id+'.search',self.search);
        }
        cb(self);
    });
}

TSClient.prototype = new EventEmitter();

TSClient.prototype.syncSearch = function(callback) {
    console.log("new sync "+JSON.stringify(this.search));
    walker({ts:this, search:this.search, cb:callback, page:1, results:[]});
}

TSClient.prototype.set = function(search)
{
    this.search = search;
    lfs.writeObjectToFile(search.id+'.search',search);    
}

function walker(s)
{
    var uri = url.parse("http://search.twitter.com/search.json");
    uri.query = {q:s.search.q, rpp:100, page:s.page, since_id:s.search.since_id};
    console.log("walking page "+url.format(uri));
    request.get({uri:url.format(uri)}, function(err, resp, body) {
        if(err)
        {
            console.log("request failed: "+err);
            s.cb([]);
            return;
        }
        var data = JSON.parse(body);
        if(data && data.results && data.results.length > 0)
        {
            s.results = s.results.concat(data.results);
            s.page++;
            console.log("page "+data.page+" and max "+data.max_id_str);
            if(data.page == 1) s.new_since_id = data.max_id_str; // first page 
        }else{
            s.page=16; // fail out below
        }
        if(s.page <= 15)
        {
            walker(s);
        }else{
            console.log("saving "+s.results.length+" tweets");
            lfs.writeObjectsToFile(s.search.id+'.tweets',s.results);
            s.search.rcount += s.results.length;
            if(s.new_since_id) s.search.since_id = s.new_since_id;
            s.ts.set(s.search);
            s.cb(s.results);
        }
    });
}

// snapshot all user info from http://api.twitter.com/1/users/show.json?user_id=12345
var userInfoQueue = [];
function enqueueUserInfoRequest(userid) {
    userInfoQueue.push(userid)
}
