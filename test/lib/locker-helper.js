var path   = require('path')
  , temp   = require('temp')
  , wrench = require('wrench')
  , fs     = require('fs')
  , util   = require('util')
  ;

var lconfig
  , locker
  ;

exports.configurate = function () {
  if (!lconfig) {
    // override from the system temporary directory because of the locker's insane insistence on relative paths.
    temp.dir = '.';

    process.env.NODE_PATH = path.join(__dirname, '..', '..', 'Common', 'node');

    process.env.LOCKER_TEST = "oh yeah";
    process.env.LOCKER_ROOT = path.join(__dirname, '..', '..');
    process.env.LOCKER_CONFIG = path.join(__dirname, '..', 'resources');
    process.env.LOCKER_ME = temp.path({prefix : 'Me.',
                                       suffix : '.test'});

    lconfig = require(path.join(__dirname, '..', '..', 'Common', 'node', 'lconfig.js'));
    lconfig.load(path.join(process.env.LOCKER_CONFIG, 'config.json'));
  }

  return lconfig;
};

function waitOnLocker(done) {
  if (locker && locker.alive) {
    console.error('locker started!');
    return done();
  } else {
    console.error('locker waiting...');
    setTimeout(function () { waitOnLocker(done); }, 250);
  }
}

exports.lockerificate = function (done) {
  exports.configurate();
  if (!locker) {
    try {
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
    locker.shutdown(0, function (returnCode) {
      if (returnCode !== 0) return done('nonzero shutdown code returned during shutdown: ' + returnCode);
      else return done();
    });
  }
  else {
    return done();
  }
};

// Node is a funny ol' thing
function cp(source, destination, callback) {
  return util.pump(fs.createReadStream(source), fs.createWriteStream(destination), callback);
}

exports.copyToMe = function (me, name, done) {
  var source = path.join(__dirname, '..', 'fixtures', 'connectors', name + '.json');
  var destdir = path.join(me, name);
  var destination = path.join(destdir, 'me.json');

  path.exists(destdir, function (exists) {
    if (!exists) {
      fs.mkdir(destdir, function (err) {
        if (err) return done(err);

        return cp(source, destination, done);
      });
    }
    else {
      return cp(source, destination, done);
    }
  });
};

exports.withMe = function (callback) {
  var config = exports.configurate();
  path.exists(config.me, function (exists) {
    if (!exists) {
      console.error('making Me directory', config.me);
      fs.mkdir(config.me, function (err) {
        if (err) return callback(err);

        return callback(null, config.me);
      });
    }
    else {
      return callback(null, config.me);
    }
  });
};

exports.fakeout = function (name, done) {
  console.error('faking configuration for', name);
  exports.withMe(function (err, me) {
    if (err) return done(err);

    exports.copyToMe(me, name, done);
  });
};

exports.fakeTwitter = function (done) {
  exports.fakeout('twitter', done);
};

exports.fakeFacebook = function (done) {
  exports.fakeout('facebook', done);
};

exports.fakeGithub = function (done) {
  exports.fakeout('github', done);
};

exports.bootstrap = function (done) {
  exports.lockerificate(done);
};

exports.shutdown = function (done) {
  exports.delockerificate(function (err) {
    if (err) return done(err);

    try {
      wrench.rmdirSyncRecursive(process.env.LOCKER_ME, false);
    }
    catch (err) {
      return done(err);
    }

    return done();
  });
};
