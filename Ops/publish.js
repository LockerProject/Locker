var commander = require('commander');
var path = require('path');
var npm = require('npm');
var fs = require('fs');

var username = 'nerds';
var email = 'nerds@singly.com';
var regBase = 'http://registry.singly.com';

if(!path.existsSync('package.json')) return console.error("missing package.json, run npm init!");
var js = JSON.parse(fs.readFileSync('package.json'));
if(js.repository.handle) {
    publish();
}else{
    var repo = {title: js.description, handle: js.name, author:'nerds', update:'auto', github:'https://github.com/LockerProject/Locker'};
    commander.prompt("type? (app or connector): ", function(type){
        type = type.replace('\n','');
        repo.type = type;
        if(type == 'app' && !path.existsSync('screenshot.png')) { console.error("missing screenshot.png"); process.exit(1)};
        if(type == 'connector' && !path.existsSync('icon.png')) { console.error("missing icon.png"); process.exit(1)};
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
    commander.password("registry nerds password: ", "*", function(password){
        console.log("publishing...");
        var auth = (new Buffer(username+":"+password,"ascii").toString("base64"));
        var config = {registry:regBase};
        npm.load(config, function(err) {
            if(err) {
                return console.error(err);
                process.exit(1);
            }
            npm.config.set("username", username);
            npm.config.set("email", email);
            npm.config.set("_auth", auth);
            npm.commands.publish(["."], function(err){
                if(err) {
                    return console.error(err);
                    process.exit(1);
                }
                console.log("published!");
                process.exit(0);
            })
        });
    });
}
