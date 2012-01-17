var path = require('path');
var npm = require('npm');
var fs = require('fs');

// must be run in Me directory!
// MUST HAVE CONSISTENT SYNCLET DIRS, xxxx-1 ones will be skipped!

var regBase = 'http://registry.singly.com';
var npmConfig = {registry:regBase, cache:'.npm'};

var lockerBase = process.argv.length > 2 ? process.argv[2] : ".."

// make sure node_modules and set npm to run locally here
try {
    fs.mkdirSync("node_modules", 0755); // ensure a local home for npm to use
} catch(E) {}
npm.load(npmConfig, function(err) {
    if(err) {
        console.error(err);
        process.exit(1);
    }
    meScan();
})

function meScan()
{
    var dirs = fs.readdirSync(".");
    for (var i = 0; i < dirs.length; i++) {
        if(dirs[i] == "diary") continue;
        var dir =  dirs[i];
        try {
            if(!fs.statSync(dir).isDirectory()) continue;
            if(!path.existsSync(path.join(dir, 'me.json'))) continue;
            var js = JSON.parse(fs.readFileSync(path.join(dir, 'me.json'), 'utf8'));
            // first skip if it's done
            if(js.installed) {
                console.log("already did "+dir);
                continue;
            };
            // dir name must match registry name
            js.handle = dir;
            // GITHUB IS SPECIAL
            if(js.srcdir && js.srcdir.indexOf("Me/github/") == 0)
            {
                console.log("merging github "+dir);
                var app = getapp(js.srcdir.substr(3)); // we're in Me/ already
                var js2 = JSON.parse(fs.readFileSync(app, 'utf8'));
                js = extend(js, js2);
                js.manifest = "Me/"+app;
                saver(js);
                continue;
            }
            // this happens async from here on out
            console.log("installing from registry "+js.handle);
            install(js);
        } catch (E) {
            console.error(dirs[i]+" failed (" +E+ ")");
        }
    }

}

function install(js)
{
    npm.commands.install([js.handle], function(err){
        if(err){ // only warn here cuz we can re-run if install fails
            console.log("failed to install "+js.handle+": "+err);
            console.log(err.stack);
            return;
        }
        console.log("extending and saving a me.json for " + js.handle);
        var js2 = JSON.parse(fs.readFileSync(path.join("node_modules", js.handle, 'package.json'), 'utf8'));
        js = extend(js, js2.repository);
        if(js.auth) js.authed = Date.now();
        js.manifest = path.join("Me/node_modules", js.handle, 'package.json');
        saver(js);
    });

}

function saver(js)
{
    js.id = js.provider = js.handle; // kinda legacy where they could differ
    js.srcdir = path.dirname(js.manifest);
    js.installed = Date.now();
    fs.writeFileSync(path.join(js.id, 'me.json'), JSON.stringify(js, null, 4));

}

// UGH
function getapp(dir)
{
    var dirs = fs.readdirSync(dir);
    for (var i = 0; i < dirs.length; i++) {
        if(dirs[i].indexOf(".app") > 0) return path.join(dir, dirs[i]);
    }
    return false;
}

// copied from lutil
function extend() {
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
