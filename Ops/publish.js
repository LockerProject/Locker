var commander = require('commander');
var path = require('path');

// npm likes to reset process.title for some reason
var savedProcessTitle = process.title;
var npm = require('npm');
process.title = savedProcessTitle;

var fs = require('fs');
var request = require('request');

var username = 'nerds';
var email = 'nerds@singly.com';

// XXX - please add a comment here explaining the difference
var regBase = 'http://registry.singly.com';
var burrowBase = "burrow.singly.com";


if(!path.existsSync('package.json')) return console.error("missing package.json, run npm init!");
var js = JSON.parse(fs.readFileSync('package.json'));

if(js.repository.handle) {
    if (process.argv.indexOf("-i") > -1) {
        commander.password("registry nerds password: ", "*", function(password){
            console.log("publishing image...");
            var auth = (new Buffer(username+":"+password,"ascii").toString("base64"));
            if(js.repository.type == 'app') return imager(js.repository.handle, "screenshot.png", auth);
            if(js.repository.type == 'connector') return imager(js.repository.handle, "icon.png", auth);
        })
    } else {
        publish();
    }
}else{
    var repo = {title: js.description, author:'nerds', update:'auto', github:'https://github.com/LockerProject/Locker'};
    repo.handle = js.name.toLowerCase();
    commander.prompt("type? (app or connector): ", function(type){
        type = type.replace('\n','');
        repo.type = type;
        commander.prompt("static? (true or false): ", function(s){
            repo.static = s.replace('\n','');
            js.repository = repo;
            fs.writeFileSync('package.json',JSON.stringify(js,null,4));
            publish();
        });
    });
}


function publish()
{
    var type = js.repository.type;
    if(type == 'connector' && path.existsSync('synclets.json')) {
        try {
            JSON.parse(fs.readFileSync('synclets.json'));
        } catch(e){
            console.log("invalid synclets.json");
            process.exit(1);
        }
    };
    if(type == 'app' && !path.existsSync('screenshot.png')) { console.error("missing screenshot.png"); process.exit(1)};
    if(type == 'connector' && !path.existsSync('icon.png')) { console.error("missing icon.png"); process.exit(1)};
    commander.password("registry nerds password: ", "*", function(password){
        console.log("publishing...");
        var auth = (new Buffer(username+":"+password,"ascii").toString("base64"));
        var config = {registry:regBase};
        npm.load(config, function(err) {
            if(err) {
                console.error(err);
                process.exit(1);
            }
            npm.config.set("username", username);
            npm.config.set("email", email);
            npm.config.set("_auth", auth);
            npm.commands.publish(["."], function(err){
                if(err) {
                    console.log("Oh no, errors!");
                    console.error(err);
                    process.exit(1);
                }
                console.log("published!");
                if(js.repository.type == 'app') return imager(js.repository.handle, "screenshot.png", auth);
                if(js.repository.type == 'connector') return imager(js.repository.handle, "icon.png", auth);
                process.exit(0);
            })
        });
    });
}

function imager(id, file, auth)
{
    console.log("Sending the image...");
    request.get({uri:"https://" + burrowBase + "/registry/" + id, json:true}, function(err, result, body) {
        if (err) return console.error("failed to get rev");
        var uri = "https://" + burrowBase + "/registry/" + id + "/" + file + "?rev=" + body._rev;
        var stat = fs.statSync(file);
        fs.createReadStream(file).pipe(request.put({uri:uri, headers:{"Content-Type":"image/png", Authorization:"Basic " + auth, "Content-Length":stat.size}}, function(err, res){
            if(err) {
                console.error("Oh no! Error:");
                console.error(err);
            }
            process.exit(0);
        }));
    });

}

process.on("uncaughtException", function(err) {
    console.log("Uncaught exception: ");
    console.error(err);
});
