/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs');


module.exports = function(app) {
    
app.get('/getContacts',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    fs.readFile("friends.json", "binary", function(err, file) {  
        if(err) {  
            res.end();  
            return;  
        }  
        res.write("[");
        res.write(file, "binary");  
        res.write("]");
        res.end();
    });
});

}