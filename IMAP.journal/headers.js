var username = process.argv[2];
var password = process.argv[3];
if (!username || !password) {
    console.log("node headers.js user@gmail.com mypass");
    process.exit(1);
}

var fs = require('fs');
var ImapConnection = require('imap').ImapConnection, sys = require('sys'),
    imap = new ImapConnection({
      username: username,
      password: password,
      host: 'imap.gmail.com',
      port: 993,
      secure: true
    });

function die(err) {
  console.log('Uh oh: ' + err);
  process.exit(1);
}

var box, cmds, next = 0, cb = function(err) {
  if (err)
    die(err);
  else if (next < cmds.length)
    cmds[next++].apply(this, Array.prototype.slice.call(arguments).slice(1));
};
cmds = [
  function() { imap.connect(cb); },
  function() { console.log("1"); imap.openBox('INBOX', false, cb); },
  function(result) {  console.log("2"); box = result; imap.search([ ['ON', 'December 22, 2010'] ], cb); },
  function(results) {  console.log("3"); imap.fetch(results, { request: { headers: ['from', 'to', 'cc', 'subject', 'date'] } }, cb); },
  function(results) {  console.log("4"); saveResults(results); imap.logout(cb); }
];
cb();

function saveResults(res)
{
    fs.mkdir('my',0755);
    fs.mkdir('my/' + username, 0755);
    var stream = fs.createWriteStream('my/' + username + '/headers.json');
    console.log("got "+res.length+" results");
    for(var i=0;i<res.length;i++)
    {
        var h = res[i].headers;
        h.id = res[i].id;
        h.flags = res[i].flags;
        stream.write(JSON.stringify(h) + "\n");
        
    }
    stream.end();
}