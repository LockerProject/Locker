var fs = require('fs');
var express = require('express');
var connect = require('connect');

var request = require('request');
var locker = require('locker');

var twClient;

var app = express.createServer(connect.bodyParser());

var info = {};

app.get('/', function(req, res) {
    res.writeHead(200, {'Content-Type':'text/html'});
    
    res.write('Current Battery Level: ');
    
    res.write('My Phone Number:<br><form method="POST" action="updatePhoneNumber">');
    res.write('Phone #: <input name="number"');
    if(info.phoneNumber) res.write(' value="' + info.phoneNumber + '"');
    res.write('><br>');
    res.write('<input type="submit">');
    res.write('</form>');
    
    res.write('<br>');
    if(!info.twilio) {
        res.write('Twilio:<br><form method="POST" action="updateTwilio">');
        res.write('Account SID: <input name="sid"><br>');
        res.write('Auth Token: <input name="token"><br>');
        res.write('SMS URL: <input name="url"><br>');
        res.write('Twilio CallerID Number: <input name="number"><br>');
        res.write('<input type="submit">');
        res.write('</form>');
    }
    
    res.end();
});

app.post('/updateTwilio', function(req, res) {
    info.twilio = {};
    info.twilio.sid = req.body.sid;
    info.twilio.token = req.body.token;
    info.twilio.url = req.body.url;
    info.twilio.number = req.body.number;
    writeInfo();
    res.redirect('/');
});

app.post('/updatePhoneNumber', function(req, res) {
    info.phoneNumber = req.body.number;
    writeInfo();
    res.redirect('/');
});

app.get('/updateDevices', function(req, res) {
    if(!info.devices)
        info.devices = {};
    locker.providers('device/fitbit', function(err, providers) {
        for(var i in providers) {
            if(!info.devices[providers[i].id])
                info.devices[providers[i].id] = {};
            var providerInfo = info.devices[providers[i].id];
            request.get({url:providers[i].uri + 'getDevices'}, function(err, resp, body) {
                var json = JSON.parse(body);
                for(var j in json) {
                    var device = json[j];
                    if(providerInfo[device.id]) { //already seen device
                        if(providerInfo[device.id].battery !== device.battery) {
                            sendNotification("Battery level changed to \"" + device.battery + 
                                             "\" for FitBit device with ID " + device.id);
                        }
                    } else {
                        //added device
                        sendNotification("Added FitBit device with ID " + device.id);
                    }
                    providerInfo[device.id] = device;
                    writeInfo();
                }
            });
        }
    });

    locker.at('/updateDevices', 3600);
    res.writeHead(200);
    res.end();
});


function sendNotification(message) {
    if(!twClient) {
        var TwilioClient = require('twilio').Client;
        twClient = new TwilioClient(info.twilio.sid, info.twilio.token, info.twilio.url);
    }
    twClient.sendSms(info.twilio.number, info.phoneNumber, message, null, function(body) {
    }, function(body) {
        console.error('err sending SMS via Twilio: ', body);
    });
}

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    readInfo();
    app.listen(processInfo.port,function() {
        var returnedInfo = {port: processInfo.port};
        process.stdout.write(JSON.stringify(returnedInfo));
    });
});
stdin.resume();


function readInfo() {
    try {
        info = JSON.parse(fs.readFileSync('info.json', null, 4));
    } catch(err) {
        
    }
}

function writeInfo() {
    fs.writeFileSync('info.json', JSON.stringify(info));
}