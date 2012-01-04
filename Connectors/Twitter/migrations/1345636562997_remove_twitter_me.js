module.exports = function(dir) {
    require('fs').unlink(require('path').join(dir, 'twitter_me.json'));
    return true;
};
