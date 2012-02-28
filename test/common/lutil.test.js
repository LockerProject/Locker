var should = require('should')
, lutil = require("../../Common/node/lutil.js")
, path = require('path')
, fakeweb = require('node-fakeweb');

describe("lutil", function () {
  describe("fetchAndResizeImageURL", function () {
    var sampleAviUrl = 'http://example.com:80/avatar.jpg';

    beforeEach(function (done) {
      fakeweb.allowNetConnect = false;
      fakeweb.registerUri({
        uri         : sampleAviUrl,
        binaryFile  : path.join(__dirname, '..', 'fixtures', 'common', 'grimace.jpg'),
        contentType : 'image/jpeg'
      });
      return done();
    });

    it("downloads and resizes an avatar", function (done) {
      this.timeout(5000);
      lutil.fetchAndResizeImageURL(sampleAviUrl, '/tmp/raw', '/tmp/avatar.png', function (err, success) {
        should.not.exist(err);

        success.should.equal('avatar uploaded');
        return done();
      });
    });
  });

  describe('parseAuthor', function() {
    it("parses the full name/email format", function() {
      var data = {author : "E. X. Ample <ex@example.com>"};
      lutil.parseAuthor(data);
      data.author.name.should.equal("E. X. Ample");
      data.author.email.should.equal("ex@example.com");
    });

    it("parses just an email", function() {
      var data = {author: "ex@example.com"};
      lutil.parseAuthor(data);
      data.author.email.should.equal("ex@example.com");
    });

    it("parses just a name", function() {
      var data = {author: "E. X. Ample"};
      lutil.parseAuthor(data);
      data.author.name.should.equal("E. X. Ample");
    });
  });

  describe("strip", function() {
    it("removes whitespace from the beginning", function() {
      lutil.strip("   a").should.equal("a");
    });

    it("removes whitespace from the end", function() {
      lutil.strip("a   ").should.equal("a");
    });

    it("doesn't touch whitespace in the middle", function() {
      lutil.strip("a b").should.equal("a b");
    });
  });
});
