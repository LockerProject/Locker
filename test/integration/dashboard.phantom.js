var should  = require('should')
  , mocha   = require('mocha')
  , path    = require('path')
  , util    = require('util')
  , phantom = require('phantom')
  , helper  = require(path.join(__dirname, '..', 'lib', 'locker-helper.js'))
  ;

describe("dashboard", function () {
  before(function (done) {
    return helper.bootstrap(done);
  });

  after(function (done) {
    return helper.shutdown(done);
  });

  it("should allow people to access the DEVELOP page", function (done) {
    this.timeout(10000);
    phantom.create(function (ph) {
      ph.createPage(function (page) {
        page.open('http://localhost:8043/', function (status) {
          should.exist(status);
          status.should.be.ok;

          var body = page.evaluate(function () {
                                     $('a:contains(Develop):visible').click();
                                     return $('#appFrame').contents().text();
                                   },
                                   function (iframe) {
                                     should.exist(iframe, 'need iframe data passed back');
                                     iframe.should.include('Build an HTML5 web app.');
                                     return done();
                                   });

        });
      });
    });
  });
});
