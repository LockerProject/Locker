var sys = require("sys");
var events = require("events");
var crypto = require("crypto");
var dgram = require("dgram");
var dns = require("dns");

/*
 * Some generally useful functions.
 */
 
/**
 * Enumerate data fields of an object.
 * Function objects are skipped.
 */
function keys(o) {
    var result = [];
    for (var key in o) {
        if (o[key] && isFunction(o[key])) {
            continue;
        }
        result[result.length] = key;
    }
    return result;
}

exports.keys = keys;

/**
 * See time(2).
 */
function time() {
    return new Date().getTime() / 1000;
}

/**
 * Return a random integer 1..n inclusive.
 */
function rand(n) {
  return ( Math.floor ( Math.random ( time() ) * n + 1 ) );
}

/**
 * Test if an Object is an Array.
 */
function isArray(o) {
    return o.constructor == Array;
}

/**
 * Test if an Object is a String.
 */
function isString(o) {
    return o.constructor == String;
}

/**
 * Test if an Object is a Function.
 */
function isFunction(o) {
    return o.constructor == Function;
}

/*
 * Telex
 */

/**
 * Create a new Telex.
 * If the first argument is a string, it is used as the _to endpoint
 * for the new Telex. Otherwise all key-value pairs in the argument
 * are copied into the new Telex.
 *
 * Example:
 *  new Telex("somehost.com:41234")
 *  new Telex({_to: "somehost.com:41234", _ring: 8980})
 */
function Telex(arg){
    if (arg.constructor == String) {
        this._to = arg;
    }
    else {
        for (var key in arg) {
            this[key] = arg[key];
        }
    }
}

/**
 * Test if a telex has signals. Signals start with a '+'.
 */
Telex.prototype.hasSignals = function() {
    return keys(this).some(function(x){ return x[0] == '+' });
}

/**
 * Get all the commands in this telex.
 * Returns an object of command names mapped to command parameter,
 * with leading '.' stripped off of command name.
 */
Telex.prototype.getCommands = function() {
    var result = {};
    keys(this).filter(function(x){ return x[0] == '.' }).forEach(function(x){
        result[x] = this[x];
    });
    return result;
}

/**
 * Get all the signals in this telex.
 * Returns an object of signal names mapped to command parameter,
 * with leading '+' stripped off of signal name.
 */
Telex.prototype.getSignals = function() {
    var result = {};
    keys(this).filter(function(x){ return x[0] == '+' }).forEach(function(x){
        result[x] = this[x];
    });
    return result;
}

exports.Telex = Telex;

/**
 * Switch
 */

function Switch(bindPort){
    var self = this;
    
    // If bind port is not specified, pick a random open port.
    self.bindPort = bindPort == undefined ? 0 : parseInt(bindPort);
    
    // default seed
    self.setSeeds(["telehash.org:42424"]);
    
    // Initially, we don't know our own externally facing endpoint
    self.selfipp = null;
    self.selfhash = null;
    self.connected = false;
    
    // Store all known lines, keyed by endpoint hash.
    self.master = {};
    
    // Tap option & rules
    self.taps = [];
    
    // 160 bits, since we're using SHA1
    self.NBUCKETS=160;
    
    self.server = dgram.createSocket("udp4", function(msgstr, rinfo){
        self.recv(msgstr, rinfo);
    });
    
    self.server.on("listening", function(){
        // Lookup the bootstrap and attempt to connect
        // TODO: resolution fails when no dns server, raw IP addresses shouldn't
        for(var i=0;i<self.seeds.length;i++)
        {
            var seed = self.seeds[i];
            var seedHost = seed.substring(0,seed.indexOf(":"));
            var seedPort = seed.substring(seed.indexOf(":")+1);
            dns.resolve4(seedHost, function(err, addresses) {
                if (err) {
                    throw err;
                }
                if (addresses.length == 0) {
                    throw "Cannot resolve bootstrap host '" + seedHost;
                }
                var seedIP = addresses[0];

                // Start the bootstrap process
                self.startBootstrap(seedIP+":"+seedPort);
            });            
        }
        
        var address = self.server.address();
        console.log([
            "server listening ", address.address, ":", address.port].join(""));
    });
    
    // Register built-in command handlers
    
    self.on(".see", self.onCommand_see);
    self.on(".tap", self.onCommand_tap);
    self.on("+end", self.onSignal_end);
}

sys.inherits(Switch, events.EventEmitter);
exports.Switch = Switch;

exports.createSwitch = function(bindPort) {
    return new Switch(bindPort);
}

// add seeds to the switch (pre-start)
Switch.prototype.setSeeds = function(s) {
    this.seeds = s;
    this.seedsIndex = {};
    for(var i=0;i<s.length;i++) this.seedsIndex[s[i]]=true; // convenience in checking who was a seed
}

/**
 * Start the switch.
 * The switch will start listening on its bind port 
 * and start the bootstrap process.
 */
Switch.prototype.start = function() {
    var self = this;
    self.server.bind(self.bindPort);
}

/**
 * Stop the switch.
 */
Switch.prototype.stop = function() {
    var self = this;
    self.server.close();
}

Switch.prototype.addTap = function(tap) {
    var self = this;
    self.taps[self.taps.length] = tap;
}

Switch.prototype.taptap = function() {
    var self = this;
    self.taps.forEach(function(tap){
        var tapEnd = tap.is["+end"];
        if (!tapEnd) {
            return; // continue
        }
        
        var hashes = self.near_to(tapEnd, self.selfipp)
        .filter(function(hash){ return hash != self.selfhash; }).slice(0,3);
        
        if (!hashes || hashes.length == 0) { 
            return; // continue
        }
        
        hashes.forEach(function(hash){
            var line = self.master[hash];
            
            if (line.taplast && line.taplast + 50 > time()) {
                return; // only tap every 50sec
            }
            line.taplast = time();
            var telexOut = new Telex(line.ipp); // tap the closest ipp to our target end 
            telexOut[".tap"] = [tap];
            console.log(["\tTAPTAP to ", line.ipp, " end ", tapEnd, " tap ", JSON.stringify(tap)].join(""));
            self.send(telexOut);
        });
    });
}

/**
 * Start the bootstrap process by sending a telex to the 
 * bootstrap switch.
 */
Switch.prototype.startBootstrap = function(seed){
    var self = this;
    console.log(["SEEDING[", seed, "]"].join(""));
    var line = self.getline(seed);
    var bootTelex = new Telex(seed);
    bootTelex["+end"] = line.end; // any end will do, might as well ask for their neighborhood
    self.send(bootTelex);
    
    // Retry the bootstrap every 10s until it completes
    var bootstrapRetryID = setInterval(function() {
        if (self.connected) {
            clearInterval(bootstrapRetryID);
        }
        else {
            self.scanlines();
            self.taptap();
            self.startBootstrap(seed);
        }
    }, 10000);
    
}

/**
 * Complete the bootstrap by processing the response from
 * the bootstrap switch.
 */
Switch.prototype.completeBootstrap = function(remoteipp, telex) {
    var self = this;
    self.connected = true;
    self.selfipp = telex._to;
    self.selfhash = new Hash(self.selfipp).toString();
    
    console.log(["\tSELF[", telex._to, " = ", self.selfhash, "]"].join(""));
    
    var line = self.getline(self.selfipp);
    line.visible = 1; // flag ourselves as default visible
    line.rules = self.taps; // if we're tap'ing anything
    
    // WE are the seed, haha, remove our own line and skip
    if (self.selfipp == remoteipp) {
        console.log("\tWe're the seed!\n");
    }
    
    // Start scan/taptap interval scanning until disconnected
    var scanID = setInterval(function() {
        if (!self.connected) {
            clearInterval(scanID);
        }
        else {
            self.scanlines();
            self.taptap();
        }
    }, 10000);
    
}

/**
 * Dispatch incoming raw messages.
 * This method is called automatically on incoming dgram message.
 */
Switch.prototype.recv = function(msgstr, rinfo) {
    var self = this;
    var telex = new Telex(JSON.parse(msgstr));
    var remoteipp = rinfo.address + ":" + rinfo.port;
    console.log([
        "RECV from ", remoteipp, ": ", JSON.stringify(telex)].join(""));
    
    if (self.selfipp == null && "_to" in telex) {
        self.completeBootstrap(remoteipp, telex);
    }
    
    // if this is a switch we know, check a few things
    var line = self.getline(remoteipp, telex._ring);
    var lstat = self.checkline(line, telex, msgstr.length);
    if (!lstat) {
        console.log(["\tLINE FAIL[", JSON.stringify(line), "]"].join(""));
        return;
    }
    else {
        console.log(["\tLINE STATUS ", (telex._line ? "OPEN":"RINGING")].join(""));
    }
    
//    console.log("line: " + JSON.stringify(line));
    
    // Process commands if the line is open
    if (line) {
        for (var key in telex.getCommands()) {
//            console.log("dispatch command: " + key);
            self.emit(key, remoteipp, telex, line);
        }
    }
    
    for (var key in telex.getSignals()) {
//        console.log("dispatch signal: " + key);
        self.emit(key, remoteipp, telex, line);
    }
    
    if (telex.hasSignals()) {
        var hop = telex._hop == null ? 0 : parseInt(telex._hop)
        
        // if not last-hop, check for any active taps (todo: optimize the matching, this is just brute force)
        if (hop < 4) {
            keys(self.master)
            .filter(function(hash){ return self.master[hash].rules != null && self.master[hash].rules.length })
            .forEach(function(hash){
                var pass = 0;
                var swipp = self.master[hash].ipp;
                self.master[hash].rules.forEach(function(rule){
                    console.log(["\tTAP CHECK IS ", swipp, "\t", JSON.stringify(rule)].join(""));
                    
                    // all the "is" are in this telex and match exactly
                    var ruleIsKeys = keys(rule.is);
                    
                    if (!ruleIsKeys.every(function(isKey){ 
                            console.log("IS match: " + telex[isKey] + " = " + rule.is[isKey] + "?");
                            return telex[isKey] == rule.is[isKey]; })) {
                        return; // continue
                    }
                    
                    // pass only if all has exist
                    if (rule.has.every(function(hasKey){ 
                            console.log("HAS match: " + hasKey + " -> " + (hasKey in telex));
                            return hasKey in telex; })) {
                        pass++;
                    }
                });
                
                // forward this switch a copy
                if (pass) {
                    // it's us, it has to be our tap_js        
                    if (swipp == self.selfipp) {
                        console.log(["STDOUT[", JSON.stringify(telex), "]"].join(""));
                    }
                    else{
                        var telexOut = new Telex(swipp);
                        keys(telex).filter(function(key){ return key.match(/^\+.+/); })
                        .forEach(function(sig){
                            telexOut[sig] = telex[sig];
                        });
                        telexOut["_hop"] = hop + 1;
                        self.send(telexOut);
                    }
                }
                else{
                    console.log("\tCHECK MISS");
                }
            });
        }
        
    }
    
}

Switch.prototype.onSignal_end = function(remoteipp, telex, line) {
    var self = this;
    var hop = telex._hop == null ? 0 : parseInt(telex._hop);
    var end = telex["+end"];
    if (hop == 0) {
        var vis = line.visible ? remoteipp : self.selfipp; // start from a visible switch (should use cached result someday)
        var hashes = self.near_to(end, vis); // get closest hashes (of other switches)
        
//      console.log("+end hashes: " + JSON.stringify(hashes));
        
        // convert back to IPPs
        var ipps = {};
        hashes.slice(0,5).forEach(function(hash){
            ipps[self.master[hash].ipp] = 1;
        });
        
//      console.log("+end ipps: " + JSON.stringify(ipps));
        
        // TODO: this is where dampening should happen to not advertise switches that might be too busy
        if (!line.visibled) {
            ipps[self.selfipp] = line.visibled = 1; // mark ourselves visible at least once
        }
        
        var ippKeys = keys(ipps);
        if (ippKeys.length) {
            var telexOut = new Telex(remoteipp);
            var seeipps = ippKeys.filter(function(ipp){ return ipp.length > 1 });
            telexOut[".see"] = seeipps;
            self.send(telexOut);
        }
    }
    
    // this is our .tap, requests to +pop for NATs
    if (end == self.selfhash && telex["+pop"]) {
        console.log("POP? " + telex["+pop"]);
        var tapMatch = telex["+pop"].match(/th\:([\d\.]+)\:(\d+)/);
        if (tapMatch) {
            // should we verify that this came from a switch we actually have a tap on?
            var ip = tapMatch[1];
            var port = tapMatch[2];
            console.log(["POP to ", ip, ":", port].join(""));
            self.send(new Telex([ip, port].join(":")));
        }
    }
}

/**
 * Handle the .see TeleHash command.
 */
Switch.prototype.onCommand_see = function(remoteipp, telex, line) {
    var self = this;
    
    var seeipps = telex[".see"];
    if (!seeipps || !seeipps.length) { return; }
    
//    console.log(".see: " + JSON.stringify(seeipps));
    
    // loop through and establish lines to them (just being dumb for now and trying everyone)
    seeipps.forEach(function(seeipp){
        if (self.selfipp == seeipp) {
            // skip ourselves :)
            return; //continue;
        }
        
        // they're making themselves visible now, awesome
        if (seeipp == remoteipp && !line.visible) {
            console.log(["\t\tVISIBLE ", remoteipp].join(""));
            line.visible=1;
            self.near_to(line.end, self.selfipp).map(function(x) { return line.neighbors[x]=1; });
            self.near_to(line.end, remoteipp); // injects this switch as hints into it's neighbors, fully seeded now
        }
        
        var seeippHash = new Hash(seeipp).toString(); 
        
        if (self.master[seeippHash]) {
            return; //continue; // skip if we know them already
        }
        
        // XXX todo: if we're dialing we'd want to reach out to any of these closer to that $tap_end
        // also check to see if we want them in a bucket
        if (self.bucket_want(seeipp)) {
            
            // send direct (should open our outgoing to them)
            var telexOut = new Telex(seeipp);
            telexOut["+end"] = self.selfhash;
            self.send(telexOut);
            
            // send pop signal back to the switch who .see'd us in case the new one is behind a nat
            telexOut = new Telex(remoteipp);
            telexOut["+end"] = seeippHash;
            telexOut["+pop"] = "th:" + self.selfipp;
            telexOut["_hop"] = 1;
            self.send(telexOut);
        }
    });
}

/**
 * Handle the .tap TeleHash command.
 */
Switch.prototype.onCommand_tap = function(remoteipp, telex, line) {
    // handle a tap command, add/replace rules
    if (telex[".tap"] && isArray(telex[".tap"])) {
        line.rules = telex[".tap"];
    }
}

/**
 * Send a telex.
 */
Switch.prototype.send = function(telex) {
    var self = this;
    var line = self.getline(telex._to);
    
    // check br and drop if too much
    if (line.bsent - line.brin > 10000) {
        console.log("\tMAX SEND DROP\n");
        return;
    }
    
    // if a line is open use that, else send a ring
    if ("line" in line) {
        telex._line = parseInt(line["line"]);      
    }
    else {
        telex._ring = parseInt(line["ringout"]);
    }
    
    // update our bytes tracking and send current state
    telex._br = line.brout = line.br;
    var msg = new Buffer(JSON.stringify(telex), "utf8");
    
    line.bsent += msg.length;
    line.sentat = time();
    console.log(["SEND[", telex._to, "]\t", msg].join(""));
    
    self.server.send(msg, 0, msg.length, line.port, line.host);
}

/**
 * Get the line for a host:port endpoint,
 * creating a new line if necessary.
 */
Switch.prototype.getline = function(endpoint) {
    var self = this;
    if (!endpoint || endpoint.length < 4) {
        return undefined; // sanity check
    }
    
    var endpointHash = new Hash(endpoint).toString();
    if (!self.master[endpointHash] || self.master[endpointHash].ipp != endpoint) {
        console.log(["\tNEWLINE[", endpoint, "]"].join(""));
        var endpieces = endpoint.split(":");
        var host = endpieces[0];
        var port = endpieces[1];
        
        var lineNeighbors = {};
        lineNeighbors[endpointHash] = 1;
        
        self.master[endpointHash] = {
            ipp: endpoint,
            end: endpointHash,
            host: host,
            port: port,
            ringout: rand(32768),
            init: time(),
            seenat: 0,
            sentat: 0,
            lineat: 0,
            br: 0,
            brout: 0,
            brin: 0,
            bsent: 0,
            neighbors: lineNeighbors,
            visible: 0
        };
    }
    
    return self.master[endpointHash];
}

/**
 * Check a line's status.
 * True if open, false if ringing.
 */
Switch.prototype.checkline = function(line, t, br) {
    var self = this;
    if (!line) {
        return false;
    }
    
    // first, if it's been more than 10 seconds after a line opened, 
    // be super strict, no more ringing allowed, _line absolutely required
    if (line.lineat > 0 && time() - line.lineat > 10) {
        if (t._line != line.line) {
            return false;
        }
    }
    
    // second, process incoming _line
    if (t._line) {
        if (line.ringout <= 0) {
            return false;
        }
        
        // be nice in what we accept, strict in what we send
        t._line = parseInt(t._line);
        
        // must match if exist
        if (line.line && t._line != line.line) {
            return false;
        }
        
        // must be a product of our sent ring!!
        if (t._line % line.ringout != 0) {
            return false;
        }
        
        // we can set up the line now if needed
        if(line.lineat == 0) {
            line.ringin = t._line / line.ringout; // will be valid if the % = 0 above
            line.line = t._line;
            line.lineat = time();
        }
    }
    
    // last, process any incoming _ring's (remember, could be out of order, after a _line)
    if (t._ring) {
        // already had a ring and this one doesn't match, should be rare
        if (line.ringin && t._ring != line.ringin) {
            return false;
        }
        
        // make sure within valid range
        if (t._ring <= 0 || t._ring > 32768) {
            return false;
        }
        
        // we can set up the line now if needed
        if (line.lineat == 0) {
            line.ringin = t._ring;
            line.line = line.ringin * line.ringout;
            line.lineat = time();
        }
    }
    
    // we're valid at this point, line or otherwise, track bytes
    console.log([
        "\tBR ", line.ipp, " [", line.br, " += ",
        br, "] DIFF ", (line.bsent - t._br)].join(""));
    line.br += br;
    line.brin = t._br;
    
    // they can't send us that much more than what we've told them to, bad!
    if (line.br - line.brout > 12000) {
        return false;
    }
    
    // XXX if this is the first seenat,
    // if we were dialing we might need to re-send our telex as this could be a nat open pingback
    line.seenat = time();
    return true;
}

/**
 * Update status of all lines, removing stale ones.
 */
Switch.prototype.scanlines = function() {
    var self = this;
    var now = time();
    var switches = keys(self.master);
    var valid = 0;
    console.log(["SCAN\t" + switches.length].join(""));
    
    switches.forEach(function(hash){
        if (hash == self.selfhash || hash.length < 10) {
            return; // skip our own endpoint and what is this (continue)
        }
        
        var line = self.master[hash];
        if (line.end != hash) {
            return; // empty/dead line (continue)
        }
        
        if ((line.seenat == 0 && now - line.init > 70)
                || (line.seenat != 0 && now - line.seenat > 70)) {
            // remove line if they never responded or haven't in a while
            console.log(["\tPURGE[", hash, " ", line.ipp, "] last seen ", now - line.seenat, "s ago"].join(""));
            self.master[hash] = {};
            return;
        }
        
        valid++;
        
        if (self.connected) {
        
            // +end ourselves to see if they know anyone closer as a ping
            var telexOut = new Telex(line.ipp);
            telexOut["+end"] = self.selfhash;
        
            // also .see ourselves if we haven't yet, default for now is to participate in the DHT
            if (!line.visibled++) {
                telexOut[".see"] = [self.selfipp];
            }
            
            // also .tap our hash for +pop requests for NATs
            var tapOut = {is: {}};
            tapOut.is['+end'] = self.selfhash;
            tapOut.has = ['+pop'];
            telexOut[".tap"] = [tapOut];
            self.send(telexOut);
            
        }
    });
    
    if (!valid && !self.seedsIndex[self.selfipp]) {
        self.offline();
        self.startBootstrap();
    }
}

Switch.prototype.offline = function() {
    var self = this;
    console.log("\tOFFLINE");
    self.selfipp = null;
    self.selfhash = null;
    self.connected = false;
    self.master = {};
    self.startBootstrap();
}

/**
 * generate a .see for an +end, using a switch as a hint
 */
Switch.prototype.near_to = function(end, ipp){
    var self = this;
    
    if (!end || !ipp) {
        return undefined;
    }
    
    var endHash = new Hash(end);
    var line = self.master[new Hash(ipp).toString()];
    if (!line) {
        return undefined; // should always exist except in startup or offline, etc
    }
    
    // of the existing and visible cached neighbors, sort by distance to this end
    var see = keys(line.neighbors)
    .filter(function(x){ return self.master[x] && self.master[x].visible })
    .sort(function(a,b){ return endHash.distanceTo(a) - endHash.distanceTo(b) });
    
//    console.log("near_to: see[]=" + JSON.stringify(see));
//    console.log("near_to: line=" + JSON.stringify(line));
    
    if (!see.length) {
        return undefined;
    }
    
    var firstSee = see[0];
    var firstSeeHash = new Hash(firstSee);
    var lineNeighborKeys = keys(line.neighbors);
    var lineEndHash = new Hash(line.end);
    
    console.log(["\tNEARTO ", end, '\t', ipp, '\t', 
        lineNeighborKeys.length, ">", see.length, '\t',
        firstSeeHash.distanceTo(end), "=", lineEndHash.distanceTo(end)].join(""));
    
    // it's either us or we're the same distance away so return these results
    if (firstSee == line.end
            || (firstSeeHash.distanceTo(end) == lineEndHash.distanceTo(end))) {
        
        // this +end == this line then replace the neighbors cache with this result 
        // and each in the result walk and insert self into their neighbors
        if (line.end == end) {
            console.log(["\tNEIGH for ", end, " was ", lineNeighborKeys.join(","), " ", see.length].join(""));
            var neigh = {};
            see.slice(0,5).forEach(function(seeHash){
                neigh[seeHash] = 1;
            });
            line.neighbors = neigh;
            
            console.log(["\tNEIGH for ", end, " is ", lineNeighborKeys.join(","), " ", see.length].join(""));
            lineNeighborKeys.forEach(function(hash) {
                if (hash in self.master) {
                    if (self.master[hash].neighbors == null) {
                        self.master[hash].neighbors = {};
                    }
                    self.master[hash].neighbors[end]=1;
                    console.log(["\t\tSEED ", ipp, " into ", self.master[hash].ipp].join(""));
                }
            });
        }
        console.log(["\t\tSEE distance=", endHash.distanceTo(firstSeeHash), " count=", see.length].join(""));
        return see;
    }

    // whomever is closer, if any, tail recurse endseeswitch them
    return self.near_to(end, self.master[firstSee].ipp);
}

// see if we want to try this switch or not, and maybe prune the bucket
Switch.prototype.bucket_want = function(ipp) {
    var self = this;
    var pos = new Hash(ipp).distanceTo(self.selfhash);
    console.log(["\tBUCKET WANT[", pos, " ", ipp, "]"].join(""));
    if (pos < 0 || pos > self.NBUCKETS) {
        return undefined; // do not want
    }
    return 1; // for now we're always taking everyone, in future need to be more selective when the bucket is "full"!
}

/**
 * Hash objects represent a message digest of string content,
 * with methods useful to DHT calculations.
 * @constructor
 */
function Hash(value) {
    if (value != undefined) {
        var hashAlgorithm = crypto.createHash("SHA1");
        hashAlgorithm.update(value);
        this.digest = new Buffer(hashAlgorithm.digest("base64"), "base64");
    }
}

/**
 * Format a byte as a two digit hex string.
 */
function byte2hex(d) {
    return d < 16 ? "0" + d.toString(16) : d.toString(16);
}


exports.Hash = Hash

/**
 * Get the hash as geometrically "far" as possible from this one.
 * That would be the logical inverse, every bit flipped.
 */
Hash.prototype.far = function() {
    var result = new Hash();
    result.digest = new Buffer(this.digest.length);
    for (var i = 0; i < this.digest.length; i++) {
        result.digest[i] = this.digest[i] ^= 0xff;
    }
    return result;
}
    
/**
 * Logical bitwise 'or' this hash with another.
 */
Hash.prototype.or = function(h) {
    if (isString(h)) { h = new Hash(h); }
    
    var result = new Hash();
    result.digest = new Buffer(this.digest.length);
    for (var i = 0; i < this.digest.length; i++) {
        result.digest[i] = this.digest[i] ^ h.digest[i];
    }
    return result;
}

/**
 * Comparator for hash objects.
 */
Hash.prototype.cmp = function(h) {
    if (isString(h)) { h = new Hash(h); }
    
    for (var i = 0; i < this.digest.length; i++) {
        var d = this.digest[i] - h.digest[i];
        if (d != 0) {
            return d;
        }
    }
    return 0;
}

Hash.prototype.nibbles = function() {
    var result = [];
    for (var i = 0; i < this.digest.length; i++) {
        result[result.length] = this.digest[i] >> 4;
        result[result.length] = this.digest[i] & 0xf;
    }
    return result;
}

/**
 * XOR distance between two sha1 hex hashes, 159 is furthest bit, 0 is closest bit, -1 is same hash
 */
Hash.prototype.distanceTo = function(h) {
    if (isString(h)) { h = new Hash(h); }
    
    var nibbles = this.nibbles();
    var hNibbles = h.nibbles()
    
    var sbtab = [-1,0,1,1,2,2,2,2,3,3,3,3,3,3,3,3];
    var ret = 156;
    for (var i = 0; i < nibbles.length; i++) {
        var diff = nibbles[i] ^ hNibbles[i];
        if (diff) {
            return ret + sbtab[diff]; 
        }
        ret -= 4;
    }
    return -1; // samehash ?!
}

/**
 * Represent the hash as a hexadecimal string.
 */
Hash.prototype.toString = function() {
    var result = [];
    for (var i = this.digest.length - 1; i >= 0; i--) {
        result[i] = byte2hex(this.digest[i]);
    }
    return result.join("");
}

/**
 * Test if two hashes are equal.
 */
Hash.prototype.equals = function(h) {
    var hstr = isString(h) ? h : h.toString();
    return toString() == hstr;
}

