module.exports = function(dir) {
    console.dir(require('path').join(dir, '..', 'registry.json'));
    require('fs').unlink(require('path').join(dir, '..', 'registry.json'));
    return true;
};
