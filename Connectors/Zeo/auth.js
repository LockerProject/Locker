module.exports = {
  handler: function (host, apiKeys, done, req, res) {
    if (req.method === 'POST') {
      done(null, {
        appKey: apiKeys.appKey,
        username: req.body.username,
        password: req.body.password
      });

      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });

    res.end('Please enter your Zeo credentials:' +
      '<form method="post">' +
        '<p><label>Username: <input name="username" type="textbox" size="32" /></label></p>' +
        '<p><label>Password: <input name="password" type="password" size="32" /></label></p>' +
        '<input type="submit" value="Save!">' +
      '</form>');
  }
};
