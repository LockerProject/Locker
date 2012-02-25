/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// simply take user/pass and get an auth token

var user = process.argv[2];
var pass = process.argv[3];
if (!user || !pass)
 {
    console.log("node auth.js user pass");
    process.exit(1);
}

var fs = require('fs');
var http = require('http');

post('www.google.com','/accounts/ClientLogin', 'Email='+user+'&Passwd='+pass+'&service=youtube&source=Locker', function (data){
    console.log(data);
    var auth = data.split('=');
    if(auth[0] == 'Auth')
    {
        fs.writeFileSync("auth.token", auth[1]);
    }else{
        console.log("didn't find auth key? booo :(");
    }
});

function post(host, url, data, callback) {
    var httpClient = http.createClient(443, host, true);
    var request = httpClient.request('POST', url, {
        host: host,
        'Content-Type':'application/x-www-form-urlencoded'
    });
    request.write(data);
    request.end();
    request.on('response',
    function(response) {
        var data = '';
        response.on('data',
        function(chunk) {
            data += chunk;
        });
        response.on('end',
        function() {
            callback(data);
        });
    });
}