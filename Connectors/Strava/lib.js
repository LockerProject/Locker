var fs = require('fs'),
    url = require('url'),
    express = require('express'),
    connect = require('connect'),
    request = require('request'),
    sys = require('sys');

var athleteId = 27487;

exports.rides = function(callback, startDate, endDate) { 
  if(startDate && !startDate.match(/\d{4}\-\d{2}\-\d{2}/)) {
    callback("startDate must be in the format of YYYY-MM-DD");
    return;
  }
  if(endDate && !endDate.match(/\d{4}\-\d{2}\-\d{2}/)) {
    callback("endDate must be in the format of YYYY-MM-DD");
    return;
  }

  //create data directory, if it doesn't exist
  try {
    fs.lstatSync("data");
  } catch(e) {
    fs.mkdirSync("data", "0777");
    console.log("Created data directory.");
  }

  //go check 
  request({
    uri:"http://www.strava.com/api/v1/rides?athleteId="+athleteId+(startDate ? "&startDate="+startDate : "")+(endDate ? "&endDate="+endDate : ""),
    json: true,
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      for(var i=0; i<body.rides.length; i++) {
        console.log("Retrieve ride info for id:"+body.rides[i].id+" name:"+body.rides[i].name);
        store_ride(body.rides[i].id);
        break; //for debugging, don't bother to continue
      }
      //callback(body);
    }
  })
}

function store_ride(id) {
  request({
    uri:"http://www.strava.com/api/v1/rides/"+id,
    json: true,
  }, function(error, response, the_ride) {
    if (!error && response.statusCode == 200) {

      //TODO: this is kind of wasteful, there's some duplicated data in the efforts and map_details

      //retrieve map_details and put it in with ride
      request({
        uri:"http://www.strava.com/api/v1/rides/"+id+"/map_details",
        json: true,
      }, function(error, response, map_details) {
        console.log(map_details);
        if (!error && response.statusCode == 200)
          the_ride.ride.map_details = map_details;
      })

      //retrieve efforts and put it in with ride
      request({
        uri:"http://www.strava.com/api/v1/rides/"+id+"/efforts",
        json: true,
      }, function(error, response, efforts) {
        if (!error && response.statusCode == 200)
          the_ride.ride.efforts = efforts;
      })

      //write the whole ride to the filesystem
      console.log(the_ride);
      fs.writeFileSync("data/ride_"+id+".json", JSON.stringify(the_ride.ride));
    }
  })
}
