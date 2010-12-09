var sys = require("sys"),
    fs = require("fs"),
    http = require("http"),
    url = require('url');
  

function createRequest(theURL) {
    var client = http.createClient(80, url.parse(theURL).host);
    var req = client.request( "GET",
                              url.parse(theURL).pathname,
                              {"Host": url.parse(theURL).host});
    req.end();
    return req;
}
/*
var client = http.createClient(80, "graph.facebook.com");
var req = client.request( "GET"
                        , "/Simon.Murtha.Smith/picture"
                        , {"Host": "graph.facebook.com"});

req.end();*/

var req = createRequest('http://www.google.com/images/logos/ps_logo2.png');

req.addListener("response", function (res) {
    if(res.statusCode == 200) {
        writeFile(res, 'simon.png');
    } else if(res.statusCode == 302) {
        client.request("GET", "")
    }
});

function writeFile(res, filename) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('binary');
    var body = "";
    res.addListener("data", function (c) {
        body += c;
    });    
    res.addListener("end", function() {
        fs.writeFileSync('simon.jpg', body, 'binary');
    });
}