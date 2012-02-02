var async = require('async');
var logger;
var lutil = require('lutil');
var url = require('url');

var dataStore, dataIn, locker, state;

// internally we need these for happy fun stuff
exports.init = function(l, dStore, dIn, callback){
    dataStore = dStore;
    dataIn = dIn;
    locker = l;
    logger = l.logger;
    callback();
    loadState(function(){
        if(state.ready == 1) return; // nothing to do
        locker.listen("work/me", "/work");
        exports.sync();
    });
}

var stopped;
exports.work = function(type)
{
    stopped = false;
    if(type == "start") exports.sync();
    if(type == "stop") stopped = true;
    if(type == "warn") state.sleep = 10000;
}

function loadState(callback)
{
    try { state = JSON.parse(fs.readFileSync('state.json')); } catch(E) {}
    if(state) return callback();
    // starting from scratch, make sure clear, set initial list
    logger.error("syncing from a new state");
    dataStore.clear(function(){
        state = {sleep:500, types:[
            "facebook/getCurrent/home",
            "twitter/getCurrent/tweets", "twitter/getCurrent/timeline", "twitter/getCurrent/mentions", "twitter/getCurrent/related",
            "foursquare/getCurrent/recents", "foursquare/getCurrent/checkin",
            "instagram/getCurrent/photo", "instagram/getCurrent/feed",
            "links/"
            ]};
        saveState();
        callback();
    });
}

function saveState()
{
    lutil.atomicWriteFileSync("state.json", JSON.stringify(state));
}

// see if there's any syncing work to do in the background, only running one at a time
var syncTimeout;
var running;
exports.sync = function() {
    // if any timer for future sync, zap it
    if(syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = false;
    // don't run if told not to
    if(stopped) return;
    // don't run if we're already running
    if(running) return;
    running = true;
    // load fresh just to be safe
    loadState(function(){
        // if nothing to sync, go away
        if(!state) return logger.error("invalid state!");
        if(state.ready == 1) return;
        // see if we're all done!
        if(state.types.length == 0)
        {
            running = false;
            state.ready = 1;
            return saveState();
        }
        if(!state.current)
        {
            state.current = {};
            state.current.type = state.types.shift();
            state.current.offset = 0;
        }
        var cnt = 0;
        var lurl = locker.lockerBase + '/Me/' + state.current.type + "?full=true&stream=true&limit=250&offset="+state.current.offset;
        logger.error("syncing "+lurl);
        lutil.streamFromUrl(lurl, function(a, cb){
            cnt++;
            (state.current.type == "link/") ? dataIn.processLink({data:a}, cb) : dataIn.masterMaster(getIdr(state.current.type, a), a, cb);
        }, function(err){
            running = false;
            if(err) return logger.error("sync failed, stopping: ",err);
            // no data n no error, we hit the end, move on!
            state.current.offset += 250;
            if(cnt == 0) delete state.current;
            saveState();
            // come back again darling
            syncTimeout = setTimeout(exports.sync, state.sleep);
        })
    });
}


// generate unique id for any item based on it's event
//> u.parse("type://network/context?id=account#46234623456",true);
//{ protocol: 'type:',
//  slashes: true,
//  host: 'network',
//  hostname: 'network',
//  href: 'type://network/context?id=account#46234623456',
//  hash: '#46234623456',
//  search: '?id=account',
//  query: { id: 'account' },
//  pathname: '/context' }
function getIdr(type, data)
{
    var r = {slashes:true};
    r.host = type.substr(0, type.indexOf('/'));
    r.pathname = type.substr(type.lastIndexOf('/')+1);
    r.query = {id: r.host}; // best proxy of account id right now
    dataIn.idrHost(r, data);
    return url.parse(url.format(r),true); // make sure it's consistent
}

