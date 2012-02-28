var should  = require('should')
  , path    = require('path')
  , fakeweb = require('node-fakeweb')
  ;

describe("profiles", function () {
  describe("avatar", function () {
    var url = 'https://me.lvh.me:8443/Me/profiles';

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
          "contact://facebook/#1199931943" : {username        : "othiym23"}
        , "contact://foursquare/#13763756" : {photo           : "https://img-s.foursquare.com/userpix_thumbs/1CLNJDDV10X5VXHV.png"}
        , "contact://github/#othiym23"     : {avatar_url      : "https://secure.gravatar.com/avatar/76f12edae9553fa4dac4e985d8253b97?d=https://a248.e.akamai.net/assets.github.com%2Fimages%2Fgravatars%2Fgravatar-140.png"}
        , "contact://instagram/#11444169"  : {profile_picture : "http://images.instagram.com/profiles/profile_11444169_75sq_1319161944.jpg"}
        , "contact://lastfm/#othiym23"     : {image           : [{"#text" : "http://userserve-ak.last.fm/serve/34/1026294.jpg", size : "small"}]}
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
});
