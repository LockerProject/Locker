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
            lutil.fetchAndResizeImageURL(sampleAviUrl, '/tmp/raw', '/tmp/avatar.png', function (err, success) {
                should.not.exist(err);

                success.should.equal('avatar uploaded');
                return done();
            });
        });
    });
});
