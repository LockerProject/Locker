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

  describe("avatarUrlFromMap", function () {
    var mapUrl = 'https://me.lvh.me:8443/map/profiles';

    beforeEach(function (done) {
      fakeweb.allowNetConnect = false;
      fakeweb.registerUri({
        uri  : mapUrl,
        file : path.join(__dirname, '..', 'fixtures', 'common', 'profiles.json')
      });
      return done();
    });

    it("should return avatar.png by default if available", function (done) {
      lutil.avatarUrlFromMap(path.join(__dirname, '..', 'fixtures', 'common'), 'https://me.lvh.me:8443', function (err, url) {
        should.not.exist(err);

        url.should.equal('avatar.png');
        return done();
        });
    });

    describe("when avatar.png isn't available", function () {
      it("should return the Twitter avatar first", function (done) {
        lutil.avatarUrlFromMap('nonexistent', 'https://me.lvh.me:8443', function (err, url) {
          should.not.exist(err);

          url.should.equal('https://si0.twimg.com/profile_images/20377992/pony2_normal.png');
          return done();
          });
      });

      it("should fall back to Facebook when Twitter isn't available", function (done) {
        var sampleMap = {
          "contact://facebook/#1199931943" : {username : "othiym23"}
          , "contact://foursquare/#13763756" : {photo : "https://img-s.foursquare.com/userpix_thumbs/1CLNJDDV10X5VXHV.png"}
          , "contact://github/#othiym23" : {avatar_url : "https://secure.gravatar.com/avatar/76f12edae9553fa4dac4e985d8253b97?d=https://a248.e.akamai.net/assets.github.com%2Fimages%2Fgravatars%2Fgravatar-140.png"}
          , "contact://instagram/#11444169" : {profile_picture : "http://images.instagram.com/profiles/profile_11444169_75sq_1319161944.jpg"}
          , "contact://lastfm/#othiym23" : {image : [{"#text" : "http://userserve-ak.last.fm/serve/34/1026294.jpg", size : "small"}]}
        };
        fakeweb.registerUri({
          uri  : mapUrl,
          body : JSON.stringify(sampleMap)
        });
        lutil.avatarUrlFromMap('nonexistent', 'https://me.lvh.me:8443', function (err, url) {
          should.not.exist(err);

          url.should.equal('http://graph.facebook.com/othiym23/picture');
          return done();
          });
      });

      it("should fall back to Github when Facebook isn't available", function (done) {
        var sampleMap = {
          "contact://foursquare/#13763756" : {photo : "https://img-s.foursquare.com/userpix_thumbs/1CLNJDDV10X5VXHV.png"}
          , "contact://github/#othiym23" : {avatar_url : "https://secure.gravatar.com/avatar/76f12edae9553fa4dac4e985d8253b97?d=https://a248.e.akamai.net/assets.github.com%2Fimages%2Fgravatars%2Fgravatar-140.png"}
          , "contact://instagram/#11444169" : {profile_picture : "http://images.instagram.com/profiles/profile_11444169_75sq_1319161944.jpg"}
          , "contact://lastfm/#othiym23" : {image : [{"#text" : "http://userserve-ak.last.fm/serve/34/1026294.jpg", size : "small"}]}
        };
        fakeweb.registerUri({
          uri  : mapUrl,
          body : JSON.stringify(sampleMap)
        });
        lutil.avatarUrlFromMap('nonexistent', 'https://me.lvh.me:8443', function (err, url) {
          should.not.exist(err);

          url.should.equal('https://secure.gravatar.com/avatar/76f12edae9553fa4dac4e985d8253b97?d=https://a248.e.akamai.net/assets.github.com%2Fimages%2Fgravatars%2Fgravatar-140.png');
          return done();
          });
      });

      it("should fall back to Foursquare when Github isn't available", function (done) {
        var sampleMap = {
          "contact://foursquare/#13763756" : {photo : "https://img-s.foursquare.com/userpix_thumbs/1CLNJDDV10X5VXHV.png"}
          , "contact://instagram/#11444169" : {profile_picture : "http://images.instagram.com/profiles/profile_11444169_75sq_1319161944.jpg"}
          , "contact://lastfm/#othiym23" : {image : [{"#text" : "http://userserve-ak.last.fm/serve/34/1026294.jpg", size : "small"}]}
        };
        fakeweb.registerUri({
          uri  : mapUrl,
          body : JSON.stringify(sampleMap)
        });
        lutil.avatarUrlFromMap('nonexistent', 'https://me.lvh.me:8443', function (err, url) {
          should.not.exist(err);

          url.should.equal('https://img-s.foursquare.com/userpix_thumbs/1CLNJDDV10X5VXHV.png');
          return done();
          });
      });

      it("should fall back to Instagram when Foursquare isn't available", function (done) {
        var sampleMap = {
          "contact://instagram/#11444169" : {profile_picture : "http://images.instagram.com/profiles/profile_11444169_75sq_1319161944.jpg"}
          , "contact://lastfm/#othiym23" : {image : [{"#text" : "http://userserve-ak.last.fm/serve/34/1026294.jpg", size : "small"}]}
        };
        fakeweb.registerUri({
          uri  : mapUrl,
          body : JSON.stringify(sampleMap)
        });
        lutil.avatarUrlFromMap('nonexistent', 'https://me.lvh.me:8443', function (err, url) {
          should.not.exist(err);

          url.should.equal('http://images.instagram.com/profiles/profile_11444169_75sq_1319161944.jpg');
          return done();
          });
      });

      it("should give last.fm a shot if all else fails (sure why not)", function (done) {
        var sampleMap = {
          "contact://lastfm/#othiym23" : {image : [{"#text" : "http://userserve-ak.last.fm/serve/34/1026294.jpg", size : "small"}]}
        };
        fakeweb.registerUri({
          uri  : mapUrl,
          body : JSON.stringify(sampleMap)
        });
        lutil.avatarUrlFromMap('nonexistent', 'https://me.lvh.me:8443', function (err, url) {
          should.not.exist(err);

          url.should.equal('http://userserve-ak.last.fm/serve/34/1026294.jpg');
          return done();
          });
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
