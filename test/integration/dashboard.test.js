var Browser = require('zombie')
  , should  = require('should')
  , mocha   = require('mocha')
  , path    = require('path')
  , util    = require('util')
  , async   = require('async')
  , helper  = require(path.join(__dirname, '..', 'lib', 'locker-helper.js'))
  ;

describe("dashboard", function () {
  var browser;

  before(function (done) {
    return async.series([helper.fakeTwitter,
                         helper.fakeFacebook,
                         helper.fakeGithub,
                         helper.bootstrap],
                        done);
  });

  beforeEach(function (done) {
    browser = new Browser({site  : 'http://localhost:8043/',
                           //debug : true,
                           wait  : 2000});
    return done();
  });

  after(function (done) {
    return helper.shutdown(done);
  });

  it("should have the map in a sane state", function (done) {
    browser.visit('/map', function (err, nubrowser, status) {
      if (err) return done(err);

      should.exist(status, 'status is available');
      status.should.be.ok;

      var map = JSON.parse(nubrowser.text());

      should.exist(map.facebook, 'facebook is on the map');
      should.exist(map.facebook.authed, 'facebook is authed');
      map.facebook.authed.should.be.above(0);
      map.facebook.type.should.equal('connector');

      should.exist(map.twitter, 'twitter is on the map');
      should.exist(map.twitter.authed, 'twitter is authed');
      map.twitter.authed.should.be.above(0);
      map.twitter.type.should.equal('connector');

      should.exist(map.github, 'github is on the map');
      should.exist(map.github.authed, 'github is authed');
      map.github.authed.should.be.above(0);
      map.github.type.should.equal('connector');

      return done();
    });
  });

  it("should allow people to access the DEVELOP page", function (done) {
    this.timeout(10000);
    browser.visit('/dashboard/', function (err, nubrowser, status) {
      if (err) return done(err);

      should.exist(status);
      status.should.be.ok;

      nubrowser.clickLink('Develop', function (err, lobrowser, status) {
        if (err) return done(err);

        should.exist(status);
        status.should.be.ok;

        var iframe = lobrowser.evaluate("$('#appFrame').contents().text()");
        should.exist(iframe);
        iframe.should.include('Build an HTML5 web app');

        return done();
      });
    });
  });

  it("should allow account holders to change their settings", function (done) {
    browser.visit('/dashboard/', function (err, firstbrowser, status) {
      if (err) return done(err);

      should.exist(status);
      status.should.be.ok;

      firstbrowser.clickLink('Account Settings', function (err, nextbrowser, status) {
        if (err) return done(err);

        should.exist(status);
        status.should.be.ok;

        nextbrowser.body.should.include('ACCOUNT SETTINGS');
        return done();
      });
    });
  });
});
