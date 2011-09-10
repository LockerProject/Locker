/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    async = require('async'),
    ImapConnection = require('./imap').ImapConnection;

var debug = true;

module.exports = function(auth) {
    var IMAPConnection = {};
    var client;
    
    
    IMAPConnection.connectToServer = function(callback) {
        client = new ImapConnection(auth);
        client.connect(function(err) {
            callback(err);
        });
    }
    
    IMAPConnection.getMailboxArray = function(callback) {
        client.getBoxes(function(err, mailboxes) {
            if(err)
                return callback(err);
            
            callback(err, getMailboxPaths(mailboxes));
        });
    }
    
    IMAPConnection.logout = function(callback) {
        client.logout(callback);
    }
    
    IMAPConnection.fetchMessages = function(mailbox, query, maxUIDs, fetchMessageCallback) {
        var results;
        
        async.series({
            connect: function(callback) {
                reconnectToBox(mailbox, callback);
            },
            search: function(callback) {
                if (debug) console.error('search: ' + query);
                client.search([ ['UID', 'SEARCH', query] ], function(err, searchResults) {
                    results = searchResults;
                    callback(err, 'search');
                });
            },
            fetch: function(callback) {
                if (debug) console.error('fetch');
                if(results.length < 1) 
                    return callback(null, 'fetch');
                var theseUIDs = results.splice(0, maxUIDs);
                try {
                    getMessages(theseUIDs, mailbox, function(messages) {
                        fetchMessageCallback(null, messages);
                    });
                } catch(e) {
                    // catch IMAP module's lame exception handling here and parse to see if it's REALLY an exception or not. Bah!
                    if (e.message !== 'Nothing to fetch') {
                        console.error(e);
                        callback(e, 'fetch');
                    } else {
                        callback(null, 'fetch');
                    }
                }
            }
        },
        function(err, results) {
            if (err) {
                console.error(err);
            }
            fetchMessageCallback(err);
        });
    }
    
    function reconnectToBox(mailbox, callback) {
        try {
            if(client._state.conn._readWatcher.socket)
                client._state.conn._readWatcher.socket.destroy();
        } catch(exp) {
            console.error('exception while destroying socket! ', exp);
        }
        client = new ImapConnection(auth);
        client.connect(function(err) {
            if(err) console.error('error connecting:', err);
            console.error("DEBUG: mailbox", mailbox);
            client.openBox(mailbox, false, callback);
        });
    }
    
    function getMessages(uids, mailbox, callback) {
        fetchAllHeaders(uids, { headers: true }, mailbox, function(headers) {
            getBodies(headers, mailbox, callback);
        });
    }
    
    function fetchAllHeaders(uids, request, mailbox, callback) {
        fetchHeaders(uids, request, function(err, headers) {
            if(err) {
                var highestUID = 0;
                for(var i in headers) {
                    if(headers[i].id > highestUID)
                        highestUID = headers[i].id;
                }
                reconnectToBox(mailbox, function() { //reconnect
                    if (debug) console.error('reconnected');
                    var sliceAt = 0;
                    for(var i in uids) {
                        if(parseInt(uids[i]) > highestUID) {
                            sliceAt = parseInt(i) + 1;
                            break;
                        }
                    }
                    if(sliceAt < uids.length - 1) { //start again from the next one
                        fetchAllHeaders(uids.slice(sliceAt, uids.length), request, mailbox, function(moreHeaders) {
                            //add the rest of the headers to the end of the list
                            for(var i in moreHeaders)
                                headers.push(moreHeaders[i])
                            return callback(headers);
                        }); 
                    } else {
                        return callback(headers);
                    }
                });
            } else {
                callback(headers);
            }
        });
    }
    
    var timeout = 5000;
    function fetchHeaders(uids, request, callback) {
        var messages = []; //must be a hash because it gets extended with body data later
        var fetch = client.fetch(uids, {request: request});
        
        fetch.on('message', function(msg) {
            var t = setTimeout(function() {
                if (debug) console.error('stuck on message, closing connection and reconnecting!!!');
                callback('timeout', messages);
            }, timeout);
            msg.on('error', function(err) {
                console.error('DEBUG: msg err', err);
                callback(err, messages);
            });
            msg.on('end', function() {
                clearTimeout(t);
                if (debug) console.error('Finished: ' + msg.id);
                messages.push(msg);
            });
        });
        
        fetch.on('end', function() {
            callback(null, messages);
        });
        
        fetch.on('error', function(err) {
            console.error('DEBUG: fetch err', err);
            callback(err, messages);
        });
    }
    
    function getBodies(headersArray, mailbox, callback, messages) {
        if(!messages) messages = [];
        if(!headersArray || headersArray.length < 1) {
            process.nextTick(function() {
                callback(messages);
            });
            return;
        }
        var headers = headersArray.shift();
        
        getBodyParts(headers, mailbox, function(err, bodyParts) {
            headers.body = bodyParts;
            messages.push(headers);
            getBodies(headersArray, mailbox, callback, messages);
        });
    }
    
    function getBodyParts(headers, mailbox, callback, body) {
        if(!body) body = [];
        if(!headers || !headers.structure || headers.structure.length < 1) {
            process.nextTick(function() {
                callback(null, body);
            });
            return;
        }

        var part = headers.structure.shift();
        if(part.length > 0)
           part = part[0];
        if(!part.partID)
            return getBodyParts(headers, mailbox, callback, body);

        function done() {
            body.push(part);
            getBodyParts(headers, mailbox, callback, body);
        }

        getBodyPart(headers.id, part, mailbox, function(err) {
            if(err) {
                reconnectToBox(mailbox, function() {
                    done();
                });
            } else {
                done();
            }
        });
    }

    function getBodyPart(id, part, mailbox, callback) {
        var timeout = getTimeout(part.size, throughput);
        var partFetch = client.fetch(id, {request:{headers:false, body: '' + part.partID}});
        var data = '';
        partFetch.on('error', function(err) {
            console.error('part fetch err', err);
            reset();
        });
        partFetch.on('message', function(msg) {
            var t = setTimeout(function() {
                if (debug) console.error('stuck on message ' + id + ', part ' + part.partID
                        + ' of type ' + part.type + '/' + part.subtype + ', closing connection and reconnecting!!!');
                callback('timeout');
            }, timeout);
            msg.on('data', function(chunk) {
                //buffers are gross
                data += chunk;
            });
            msg.on('error', function(err) {
                console.error('part fetch msg error', error);
                callback(err);
            });
            msg.on('end', function() {
                clearTimeout(t);
                if(part.type === 'text') {
                    part.body = data;
                } else if(part.type) {
                    var filename = '';
                    if(part.disposition && part.disposition.filename && part.disposition.filename.length > 0) {
                        filename = part.disposition.filename
                    } else if(part.params && part.params.name && part.params.name.length > 0) {
                        filename = part.params.name;
                    }
                    //buffers are gross
                    //TODO: mkdir -p to directory and then write file
                    // var stream = fs.createWriteStream(getCleanFilename(id, part.partID, filename, mailbox), {flags:'w', encoding:'base64'});
                    // stream.write(data, 'base64');
                    // stream.end();
                    if(debug) console.error('DEBUG: non-text part', part);
                } else {
                    console.error('DEBUG: nothing?? part', part);
                }
                callback();
            });
        })
    }
    
    return IMAPConnection;
}

function getMailboxPaths(results, prefix) {
    var mailboxes = [];
    prefix = prefix || "";
    for (var i in results) {
        if (results[i]) {
            // hardwired skipping Trash, Spam, Junk folders
            if (results[i].attribs.indexOf('NOSELECT') === -1 && 
                i !== 'Trash' && i !== 'Spam' && i !== 'Junk') {
                mailboxes.push(prefix + i);
            }
            if (results[i].children !== null) {
                var moreMailboxes = getMailboxPaths(results[i].children, prefix + i + results[i].delim);
                for(var i in moreMailboxes)
                    mailboxes.push(moreMailboxes[i]);
            }
            return mailboxes;
        }
    }
}

function cleanPrefix(prefix) {
    if(typeof prefix === 'string')
        return prefix.replace(/[^a-zA-Z0-9\/-_]/g, '_');
    return prefix;
}

function getCleanFilename(msgID, partID, filename, mailbox) {
    var fn = msgID + '_' + partID + '_' + filename;
    fn = fn.replace(/[^a-zA-Z0-9-_.]/g, '_');
//    attachments/' + cleanPrefix(mailbox)
    return 'attachments/' + cleanPrefix(mailbox) + '/' + fn;
}

var throughput = 125; // KB/s
function getTimeout(partSize, throughput) {
    var timeout = 60000;
    if(partSize) {
        //     setup time    size in KB      /   (KB/s)   * (s/ms) * factor of safety
        timeout = 1000 + (partSize / 1024.0 / throughput * 1000 * 2);
        if(timeout < 3000) // some minimum
            timeout = 3000;
    }
    if(timeout > 3000) {
        if(debug) console.error('DEBUG: part.size', partSize, ', timeout', timeout);
    }
    
    return timeout;
}