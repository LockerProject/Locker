/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
//testing for the Foursquare connector

var RESTeasy = require('api-easy');
var lconfig = require('../Common/node/lconfig.js')

var suite = RESTeasy.describe("Foursquare Connector")

var svcId = "foursquare-test";

lconfig.load('config.json');

var mePath = '/Me/' + svcId;

var resultTest = {
    "id":"1111111",
    "firstName":"Invalid",
    "lastName":"Invalid",
    "photo":"https://playfoursquare.s3.amazonaws.com/userpix_thumbs/INVALID.jpg",
    "gender":"male",
    "homeCity":"Invalid, IV",
    "relationship":"friend",
    "type":"user",
    "pings":true,
    "contact":{},
    "badges":{"count":7},
    "mayorships":{"count":0,"items":[]},
    "checkins":{
        "count":85,
        "items":[
            {
                "id":"99999999999999999",
                "createdAt":1304484391,
                "type":"checkin",
                "shout":"This would be a message",
                "timeZone":"America/Dallas",
                "venue":{
                    "id":"666666666666666666666",
                    "name":"Some Places Name",
                    "contact":{},
                    "location":{
                        "address":"2323 XXX St",
                        "city":"San Francisco",
                        "state":"CA",
                        "postalCode":"94114",
                        "lat":0.750952,
                        "lng":0.438604},
                    "categories":[
                        {
                            "id":"55555555555555555",
                            "name":"Thai Restaurant",
                            "pluralName":"Thai Restaurants",
                            "icon":"https://foursquare.com/img/categories/food/default.png",
                            "parents":["Food"],
                            "primary":true
                        }
                    ],
                    "verified":false,
                    "stats":{"checkinsCount":117,"usersCount":79},
                    "todos":{"count":0}
                }
            }
        ]
    },
    "friends":{
        "count":34,
        "groups":[
            {
                "type":"friends",
                "name":"mutual friends",
                "count":1,
                "items":[
                    {
                        "id":"111",
                        "firstName":"Invalid",
                        "lastName":"Invalid",
                        "photo":"https://playfoursquare.s3.amazonaws.com/userpix_thumbs/INVALID.jpg",
                        "gender":"male",
                        "homeCity":"Invalid, IV",
                        "relationship":"friend"
                    }
                ]
            },
            {
                "type":"others",
                "name":"other friends",
                "count":30,
                "items":[]
            }
        ]
    },
    "following":{"count":1},
    "tips":{"count":0},
    "todos":{"count":0},
    "scores":{"recent":5,"max":47,"goal":50,"checkinsCount":1},
    "name":"Invalid Invalid"
};


suite.use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Foursquare connector")
        .discuss("can return all contacts")
            .path(mePath + "/getFriends")
            .get()
                .expect(200)
                .expect([resultTest])
            .unpath()
        .undiscuss()

suite.export(module);
