/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var html = require('../../Common/node/html.js');
exports.format = function(content) {
    return html.formatHTML("foursquare", content, ["#3B5998", "white", "white", "#7C9494"]); // These colors can be customized later...
};
