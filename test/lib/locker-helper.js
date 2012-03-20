var path = require('path')
  , temp = require('temp')
  ;

var lconfig
  , locker
  ;

exports.configurate = function () {
  if (!lconfig) {
    // override from the system temporary directory because of the locker's insane insistence on relative paths.
    temp.dir = '.';

    process.env.NODE_PATH = path.join(__dirname, '..', '..', 'Common', 'node');

    process.env.LOCKER_ROOT = path.join(__dirname, '..', '..');
    process.env.LOCKER_CONFIG = path.join(__dirname, '..', 'resources');
    process.env.LOCKER_ME = temp.path({prefix : 'Me.',
                                       suffix : '.test'});

    lconfig = require(path.join(__dirname, '..', '..', 'Common', 'node', 'lconfig.js'));
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

exports.delockerificate = function (done) {
  if (locker) {
    locker.shutdown(0);
  }
  return done();
};

exports.bootstrap = function (done) {
  exports.lockerificate(done);
};

exports.shutdown = function (done) {
  exports.delockerificate(done);
};
