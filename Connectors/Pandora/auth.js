module.exports = {
    handler : function (host, apiKeys, done, req, res) {
        var profileUrl = req.param('url');
        if(!profileUrl) { //starting out
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end("Make sure you're logged in to <a href='http://pandora.com/'>Pandora</a> and go to your 'My Profile' page (under your email in the upper right corner).  Then cut and paste the url from the browser here, mine looks like <tt>http://www.pandora.com/#!/profile/activity/jeremie48</tt> as an example: <form><input name='url' size=100><input type='submit' value='Save!'></form>");
            return;
        }
        var path = require('path');
        var webname = path.basename(profileUrl);
        done(null, {webname:webname});
    }
}