var fs = require('fs'),
    xml2js = require('xml2js'),
    wwwdude = require('wwwdude');
    
var wwwdude_client = wwwdude.createClient({
    encoding: 'binary'
});

var debug = false;

var api_key = process.argv[2];
var user_id = process.argv[3];

if (!api_key || !user_id) {
    console.log("node client.js <api_key> <user_id>");
    console.log("create one at http://www.last.fm/api");
    process.exit(1);
}

try {
    fs.statSync('my');
} catch(err) {
    fs.mkdirSync('my', 0755);
}
    
try {
    fs.statSync('my/' + user_id);
} catch(err) {
    fs.mkdirSync('my/' + user_id, 0755);
}

var meta = readMeta(user_id);
var allTracks = [];
var newest = parseInt(meta.newest);
var lastFM_ms = 0, parse_ms = 0;

function pullTracks(user, page, limit, to, from) {
    try {
        var startLFM = now();
        wwwdude_client.get('http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks' + 
                                                            '&user=' + user + 
                                                            '&to=' + to +
                                                            (from ? '&from=' + from : '') + 
                                                            '&api_key=' + api_key + 
                                                            '&limit=' + limit + 
                                                            '&page=' + page)
        .addListener('error',
        function(err) {
            sys.puts('Network Error: ' + sys.inspect(err));
        })
        .addListener('http-error',
        function(data, resp) {
            sys.puts('HTTP Error for: ' + resp.host + ' code: ' + resp.statusCode + '\nData: ' + data);
        })
        .addListener('redirect',
        function(data, resp) {
            })
        .addListener('success',
        function(data, resp) {
            try {
                var parser = new xml2js.Parser();
                parser.addListener('end', function(result) {
                    var tracks = result.recenttracks.track;
                    for(var i = 0; i < tracks.length; i++) {
                        if(debug) console.log(JSON.stringify(tracks[i]) + '\n');
                        allTracks.push(tracks[i]);
                    }
                    if(debug) console.log(JSON.stringify(result.recenttracks["@"]));
                    console.log('downloaded ' + allTracks.length + ' of ' + result.recenttracks["@"].total);
                    if(tracks.length >= limit) { //there's more
                        pullTracks(user, page + 1, limit);
                    } else { //done!
                        writeTracks(user);
                    }
                });
                parser.parseString(data);
            } catch(err) {
                //                  console.lo
                }
        }).send();
    } catch(err) {    
        sys.puts('Error: ' + sys.inspect(err));
    }
}

function nowSec() {
    return now() / 1000;
}
function now() {
    return new Date().getTime();
}

function readMeta(user) {
    try {
        return JSON.parse(fs.readFileSync('my/' + user + '/meta.json', 'utf-8'));
    } catch(err) { 
        return {'newest':0}
    }
}

function writeTracks(user) {
    if(debug) console.log('writing ' + allTracks.length + ' tracks');
    var stream = fs.createWriteStream('my/' + user + '/tracks.json', {'flags': 'a'});
    for(var i = allTracks.length - 1; i >=0 ; i--) {
        if(allTracks[i].date) {
            var date = parseInt(allTracks[i].date['@'].uts);
            if(debug) console.log(date + ' ' + newest);
            if(date > newest)
                newest = date;
            //console.log('writing ' + JSON.stringify(allTracks[i]) + '\n\n');
            stream.write(JSON.stringify(allTracks[i]) + "\n");
            console.log('wrote ' + i);
        }
    }
    stream.end();
    var meta = {"newest":newest};
    if(debug) console.log('meta: ' + JSON.stringify(meta));
    fs.writeFileSync('my/' + user + '/meta.json', JSON.stringify(meta), 'utf-8');
}


pullTracks(user_id, 1, 200, nowSec(), newest + 1);