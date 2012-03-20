var path = require('path')
  , temp = require('temp')
  ;

var lconfig
  , locker
  ;

exports.configurate = function () {
  if (!lconfig) {
    process.env.NODE_PATH = path.join(__dirname, '..', '..', 'Common', 'node');

    lconfig = require(path.join(__dirname, '..', '..', 'Common', 'node', 'lconfig.js'));
    lconfig.load(path.join(__dirname, '..', 'resources', 'config.json'));

    temp.dir = '.'; // override from the system temporary directory because of the locker's insane insistence on relative paths.
    lconfig.me = temp.path({prefix : 'Me.', suffix : '.test'});
    lconfig.lockerDir = path.join(__dirname, '..', '..');
  }

  return lconfig;
};

function waitOnLocker(done) {
  if (locker && locker.alive) {
    return done();
  } else {
    setTimeout(function () { waitOnLocker(done); }, 250);
  }
}

exports.lockerificate = function (done) {
  exports.configurate();
  if (!locker) {
    try {
      console.error('process.env.NODE_PATH is', process.env.NODE_PATH);
      console.error("loading locker!");
      locker = require(path.join(__dirname, '..', '..', 'lockerd.js'));
      console.error("locker loaded!");
    }
    catch (err) {
      return done(err);
    }
  }

  return waitOnLocker(done);
};

exports.bootstrapLocker = function (done) {
  exports.lockerificate(done);
};
