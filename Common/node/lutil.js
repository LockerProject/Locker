var fs = require("fs");
var path = require("path");
var url = require("url");
var async = require("async");
var request = require("request");

/**
 * Adopted from jquery's extend method. Under the terms of MIT License.
 *
 * http://code.jquery.com/jquery-1.4.2.js
 *
 * Modified by Brian White to use Array.isArray instead of the custom isArray method
 */
exports.extend = function() {
  // copy reference to target object
  var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;

  // Handle a deep copy situation
  if (typeof target === "boolean") {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== "object" && typeof target !== 'function')
    target = {};

  var isPlainObject = function(obj) {
    // Must be an Object.
    // Because of IE, we also have to check the presence of the constructor property.
    // Make sure that DOM nodes and window objects don't pass through, as well
    if (!obj || toString.call(obj) !== "[object Object]" || obj.nodeType || obj.setInterval)
      return false;

    var has_own_constructor = hasOwnProperty.call(obj, "constructor");
    var has_is_property_of_method = hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf");
    // Not own constructor property must be Object
    if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
      return false;

    // Own properties are enumerated firstly, so to speed up,
    // if last one is own, then all properties are own.

    var last_key;
    for (var key in obj)
      last_key = key;

    return typeof last_key === "undefined" || hasOwnProperty.call(obj, last_key);
  };


  for (; i < length; i++) {
    // Only deal with non-null/undefined values
    if ((options = arguments[i]) !== null) {
      // Extend the base object
      for (name in options) {
        src = target[name];
        copy = options[name];

        // Prevent never-ending loop
        if (target === copy)
            continue;

        // Recurse if we're merging object literal values or arrays
        if (deep && copy && (isPlainObject(copy) || Array.isArray(copy))) {
          var clone = src && (isPlainObject(src) || Array.isArray(src)) ? src : Array.isArray(copy) ? [] : {};

          // Never move original objects, clone them
          target[name] = exports.extend(deep, clone, copy);

        // Don't bring in undefined values
        } else if (typeof copy !== "undefined")
          target[name] = copy;
      }
    }
  }

  // Return the modified object
  return target;
};

// Found on http://bonsaiden.github.com/JavaScript-Garden/#types.typeof
exports.is = function(type, obj) {
    var clas = Object.prototype.toString.call(obj).slice(8, -1);
    return obj !== undefined && obj !== null && clas === type;
};

exports.addAll = function(thisArray, anotherArray) {
    if(!(thisArray && anotherArray && anotherArray.length))
        return;
    for(var i = 0; i < anotherArray.length; i++)
        thisArray.push(anotherArray[i]);
};

exports.ucfirst = function(str) {
    return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
}

exports.getPropertyInObject = function(jsonObject, propertyName, callback) {

    var foundValues = [];

    function recurseObject(jsonObject, propertyName) {
        if (exports.is("Object", jsonObject)) {
            for (var m in jsonObject) {
                if (jsonObject.hasOwnProperty(m)) {
                    if (m === propertyName) {
                        foundValues.push(jsonObject[m]);
                    }
                    else if (exports.is("Object", jsonObject[m])) {
                        recurseObject(jsonObject[m], propertyName);
                    }
                    else if (exports.is("Array", jsonObject[m])) {
                        for (var n=0; n<jsonObject[m].length; n++) {
                            recurseObject(jsonObject[m][n], propertyName);
                        }
                    }
                }
            }
        }
    }
    recurseObject(jsonObject, propertyName);
    callback(foundValues);
};

// quick/dirty sanitization ripped from the Jade template engine
exports.sanitize = function(term){
    return String(term)
        .replace(/&(?!\w+;)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

exports.trim = function(stringToTrim) {
  return stringToTrim.replace(/^\s+|\s+$/g,"");
};
exports.ltrim = function(stringToTrim) {
  return stringToTrim.replace(/^\s+/,"");
};
exports.rtrim = function(stringToTrim) {
  return stringToTrim.replace(/\s+$/,"");
};

exports.atomicWriteFileSync = function(dest, data) {
    var tmp = dest + '.tmp';
    var bkp = dest + '.bkp';
    var stat = undefined;

    try {
        stat = fs.statSync(dest);
    } catch (err) {
    }

    // make a backup iff the destination file already exists
    if (stat)
        fs.writeFileSync(bkp, fs.readFileSync(dest));

    // write out the new contents to a temp file
    fs.writeFileSync(tmp, data);

    // check if it worked
    if(data.length && fs.statSync(tmp).size !== Buffer.byteLength(data, 'utf8')) throw new Error('atomic write error! file size !== data.length');

    // atomically rename the temp file into place
    fs.renameSync(tmp, dest);
}

// this is for node 0.4.x, it's built into path in node 0.6
exports.relative = function(from, to) {
    from = path.resolve(from).substr(1);
    to = path.resolve(to).substr(1);

    var fromParts = from.split('/');
    var toParts = to.split('/');

    var length = Math.min(fromParts.length, toParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
        if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
        }
    }

    var outputParts = [];
    for (var i = samePartsLength; i < fromParts.length; i++) {
        outputParts.push('..');
    }

    outputParts = outputParts.concat(toParts.slice(samePartsLength));

    return outputParts.join('/');
};


// processes a json newline stream, cbEach(json, callback) and cbDone(err) when done
exports.streamFromUrl = function(url, cbEach, cbDone) {
    var ended = false;
    var q = async.queue(function(chunk, cb){
        if(chunk == "") return cb();
        try{ var js = JSON.parse(chunk); }catch(E){ return cb(); }
        cbEach(js, cb);
    },1);
    var error;
    var req = request.get({uri:url}, function(err){
        if(err) error = err;
        ended = true;
        q.push(""); // this triggers the drain if there was no data, GOTCHA
    });
    var buff = "";
    req.on("data",function(data){
        buff += data.toString();
        var chunks = buff.split('\n');
        buff = chunks.pop(); // if was end \n, == '', if mid-stream it'll be a not-yet-complete chunk of json
        chunks.forEach(q.push);
    });
    q.drain = function(){
        if(!ended) return; // drain can be called many times, we only care when it's after data is done coming in
        cbDone(error);
    };
    req.on("end",function(){
        ended = true;
        q.push(""); // this triggers the drain if there was no data, GOTCHA
    });
}
// creates an idr, type://network/context?id=account#id
// context and account are optional
exports.idrNew = function(type, network, id, context, account)
{
    var r = {slashes:true};
    r.host = network;
    r.pathname = (context) ? context : '/';
    if(account) r.query = {id: account.toString()};
    r.protocol = type;
    if(id) r.hash = id.toString();
    return url.format(r);
}
/*
IDR

A simple way to store a rich extensible id structure as a parseable/serializeable string key, examples:

require('url').parse('tweet://twitter/mention?id=jeremie#103976138702983168',true)
{ protocol: 'tweet:',
  slashes: true,
  host: 'twitter',
  hostname: 'twitter',
  href: 'tweet://twitter/mention?id=jeremie#103976138702983168',
  hash: '#103976138702983168',
  search: '?id=jeremie',
  query: { id: 'jeremie' },
  pathname: '/mention' }

require('url').parse('post://facebook/wall?id=630347951#630347951_10150351352017952',true)
{ protocol: 'post:',
  slashes: true,
  host: 'facebook',
  hostname: 'facebook',
  href: 'post://facebook/wall?id=630347951#630347951_10150351352017952',
  hash: '#630347951_10150351352017952',
  search: '?id=630347951',
  query: { id: '630347951' },
  pathname: '/wall' }

IDR - TL;DR

There are an innumerable amount of things that need to be "addressed" within the locker, and not just externally, but strong internal references to the actual local storage identifiers as well.  These addressible entities are not simple GUIDs either, they have a critical set of metadata that makes up their identity, most importantly the originating network, the type of entity it is on that network, and the unique identifier assigned to it by that network.  Often equally important is the context in which it was discovered from that network, the common example being a tweet, from twitter, encountered as a mention.  Other locally important attributes sometimes need to be tracked as well, such as the account id that the entity originated from.

All of these attributes are required to uniquely resolve a reference to an entity to the actual data, either locally (requiring the context and account bits) or globally (just the type, network, and id bits).  While programmatically each of these is independently important, as identifiers they need to be stored in a consistent way as a unique string for simple KV lookups/matching.  There is a standard and built-in library perfect for this job, URLs! They're also very familiar to read and the tools handle all the encoding, parsing, etc.

*/
