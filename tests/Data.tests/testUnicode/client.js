var app = require('express').createServer();

app.get('/test', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });

    res.end('{"data":"♈♉♌♟♖Дворцовλευταῖόपशुपतिरपि तान्यहा學而時اибашен"}');
});

process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    app.listen(0, function() {
        process.stdout.write(JSON.stringify({port: app.address().port}));
    });
});

process.stdin.resume();
