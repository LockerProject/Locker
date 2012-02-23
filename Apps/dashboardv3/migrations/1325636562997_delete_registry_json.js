module.exports = function(dir) {
    require('fs').unlink(require('path').join(dir, '..', 'registry.json'));
    return true;
};
