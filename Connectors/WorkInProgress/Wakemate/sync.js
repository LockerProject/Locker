/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    lfs = require('../../Common/node/lfs.js'),
    request = require('request'),
    dataStore = require('../../Common/node/connector/dataStore'),
    utils = require('../../Common/node/connector/utils'),
    app = require('../../Common/node/connector/api'),
    EventEmitter = require('events').EventEmitter;

    
var updateState, auth, allKnownIDs;

exports.eventEmitter = new EventEmitter();

exports.init = function(theauth, mongo) {
    auth = theauth;
    dataStore.init("id", mongo);
}

exports.syncItems = function(callback) {
    // // here you would pull down all the items from the provider, after each item, you would:
    // dataStore.addObject('items', item, function(err) {
    //     var eventObj = {source:'items', type:'new', status:item};
    //     exports.eventEmitter.emit('event/Type', eventObj);
    // });
    // callback(err, 3600, "Updated " + items.length + " items");    
}

exports.getCurrent = function(req, res) {
	res.end(dataStore.getCurrent(req.params.id));
};

exports.getAllCurrent = function(req, res) {
	// res.end("sdfsdfds");
	dataStore.getAllCurrent(null, function(err, response) {
		console.dir(response);
	    res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(response));
	});
}

dataStore.getAllCurrent = function(type, callback) {
    // var m = mongo.collections[type];
    // if(!m) 
    //     callback(new Error('invalid type:' + type), null);
    // else
    //     m.find({}, {}).toArray(callback);


		var util   = require('util'),
		    spawn = require('child_process').spawn,
		    ruby  = spawn('ruby', [__dirname + '/fetch_all.rb']);

	  console.log('Spawned child pid: ' + ruby.pid);

		ruby.stdout.on('data', function (data) {
		  console.log('stdout: ' + data);
			callback(null, JSON.parse(data))
		});

		ruby.stderr.on('data', function (data) {
		  console.log('stderr: ' + data);
			callback(null, null)		
		});

		ruby.on('exit', function (code) {
		  console.log('child process exited with code ' + code);

		});

		// ruby.stdin.write("ping\n");
  
}

dataStore.getCurrent = function(type, id, callback) {
    // var m = getMongo(type, id, callback);
    //  if(m) {
    //      var query = {};
    //      query[mongoID] = id;
    //      m.findOne(query, callback);
    //  }
		callback(null, { date  : "2011-07-12T03:55:18Z", sleep_score : 50})

}



/*
[{ date  : "2011-07-12T03:55:18Z", sleep_score : 50},{ date : "2011-07-13T03:55:18Z", sleep_score :80}]

*/