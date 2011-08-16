/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
//testing for the Wordpress connector

var RESTeasy = require('api-easy');
var lconfig = require('../Common/node/lconfig.js');

var suite = RESTeasy.describe("Wordpress Connector");

var svcId = "wordpress-test";

lconfig.load('Config/config.json');

var mePath = '/Me/' + svcId;

suite.use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Wordpress connector")
        .discuss("can return all posts")
            .path(mePath + "/posts")
            .get()
                .expect(200)
                .expect([{"mt_keywords": "", "permaLink": "http://invalid.com/blog/?p=9", "postid": "9", "description": "This is just a test!", "title": "Testing", "post_status": "publish", "userid": "2", "date_created_gmt": "20110505T23:54:17", "mt_excerpt": "", "mt_allow_pings": 1, "wp_author_display_name": "Invalid", "link": "http://invalid.com/blog/?p=9", "custom_fields": [{"value": "2", "id": "6", "key": "_edit_last"}, {"value": "1304640738", "id": "5", "key": "_edit_lock"}], "mt_allow_comments": 1, "wp_password": "", "categories": ["Uncategorized"], "dateCreated": "20110505T19:54:17", "wp_author_id": "2", "blogid": "1", "wp_slug": "testing", "mt_text_more": ""}, {"mt_keywords": "", "permaLink": "http://invalid.com/blog/?p=8", "postid": "8", "description": "", "title": "The First High", "post_status": "draft", "userid": "2", "date_created_gmt": "19991130T00:00:00", "mt_excerpt": "", "mt_allow_pings": 1, "wp_author_display_name": "Inavlid", "link": "http://invalid.com/blog/?p=8", "custom_fields": [{"value": "2", "id": "4", "key": "_edit_last"}, {"value": "1239755458", "id": "3", "key": "_edit_lock"}], "mt_allow_comments": 1, "wp_password": "", "categories": [], "dateCreated": "20090414T19:35:06", "wp_author_id": "2", "blogid": "1", "wp_slug": "", "mt_text_more": ""}])
            .unpath()
        .undiscuss()

        .discuss("can return all blogs")
            .path(mePath + "/blogs")
            .get()
                .expect(200)
                .expect([{"url": "http://invalid.com/blog/", "isAdmin": true, "blogid": "1", "xmlrpc": "http://invalid.com/blog/xmlrpc.php", "blogName": "Some Test Blog"}])
            .unpath()
        .undiscuss()

        // TODO: Add more API tests as the endpoints are decided upon
    .undiscuss();

suite.export(module);
