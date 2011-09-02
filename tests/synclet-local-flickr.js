var fakeweb = require(__dirname + '/fakeweb.js');
var photos = require('../Connectors/Flickr/photos');
var contacts = require('../Connectors/Flickr/contacts');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("Flickr Synclet");
var fs = require('fs');
var curDir = process.cwd();

process.setMaxListeners(0);
process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/flickr';

process.chdir(curDir + mePath);
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

suite.next().suite.addBatch({
    "Can get contacts" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'http://api.flickr.com:80/services/rest/?api_sig=fd77bba870ac5fff4a0f3543cb6fba83&api_key=sdf&auth_token=qwert&format=json&method=flickr.contacts.getList&nojsoncallback=1&page=1&per_page=3',
                file : __dirname + '/fixtures/flickr/contacts_1.json' });
            contacts.sync(pinfo, this.callback) },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.data.contact.length, 3);
            assert.equal(response.data.contact[0].type, 'new');
            assert.equal(response.data.contact[0].obj.nsid, '12345679@N00');
            assert.equal(response.data.contact[0].obj.iconfarm, 2);
        },
        "and handles paging": function(err, response) {
            assert.isNull(err);
            assert.equal(response.config.paging.lastPage, 1);
            assert.ok(response.config.nextRun > 1314800000000);
            
        }
    }
}).addBatch({
        "Can get photos" : {
            topic: function() {
                fakeweb.allowNetConnect = false;
                fakeweb.registerUri({
                    uri : 'http://api.flickr.com:80/services/rest/?api_sig=2d9379eaa4d89a1b0703156f34cdd891&api_key=sdf&auth_token=qwert&extras=description,license,date_upload,date_taken,owner_name,icon_server,original_format,last_update,geo,tags,machine_tags,o_dimsviews,media,path_alias,url_sq,url_t,url_s,url_m,url_z,url_l,url_o&format=json&method=flickr.people.getPhotos&nojsoncallback=1&page=1&per_page=50&user_id=12345678@N00',
                    file : __dirname + '/fixtures/flickr/photos_1.json' });
                fakeweb.registerUri({
                    uri : 'http://farm5.static.flickr.com/4072/4921264930_022f68c6d9_s.jpg',
                    file : __dirname + '/fixtures/flickr/img.png',
                    contentType: 'image/png' });
                fakeweb.registerUri({
                    uri : 'http://farm5.static.flickr.com/4127/4922121188_3fc1ee8735_s.jpg',
                    file : __dirname + '/fixtures/flickr/img.png',
                    contentType: 'image/png' });
                    
                fakeweb.registerUri({
                    uri : 'http://farm5.static.flickr.com/4072/4921264930_022f68c6d9_b.jpg',
                    file : __dirname + '/fixtures/flickr/img.png',
                    contentType: 'image/png' });
                fakeweb.registerUri({
                    uri : 'http://farm5.static.flickr.com/4127/4922121188_3fc1ee8735_z.jpg',
                    file : __dirname + '/fixtures/flickr/img.png',
                    contentType: 'image/png' });
                photos.sync(pinfo, this.callback) },
            "successfully" : function(err, response) {
                assert.isNull(err);
                assert.equal(response.data.photo.length, 2);
                assert.equal(response.data.photo[0].obj.id, '4912129188');
                assert.equal(response.data.photo[0].obj.lastupdate, '1282612259');
            }
        }
}).addBatch({
    "cleanup" : {
        topic: [],
        "after itself": function(topic) {
            process.chdir(curDir);
            assert.equal(process.cwd(), curDir);
        }
    }
})

suite.export(module);
