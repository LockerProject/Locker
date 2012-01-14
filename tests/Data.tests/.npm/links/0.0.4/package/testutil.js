var util = require('./util.js');

util.expandUrl({url:"http://google.com/"},console.log,console.log);
util.extractFavicon({url:"http://google.com/foo",},console.log,console.log);
util.extractUrls({text:"hey http://google.com/ can you find bar.com or (bit.ly/foo)?"},console.log,console.log);
util.extractUrls({text:"The Telephone Game http://www.youtube.com/watch?v=wLIlkPNnxUI&feature=channel_video_title http://www.youtube.com/watch?v=wLIlkPNnxUI&feature=channel_video_title www.youtube.com"},console.log,console.log);
util.fetchHTML({url:"https://github.com/LockerProject/Locker/wiki/As-a-locker-owner%2C-i-want-to-browse-the-links-in-my-locker"},function(html){
    util.extractText({html:html},console.log,console.log);
},console.log);
