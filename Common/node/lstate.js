/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var lfs = require("lfs");
var fs = require("fs");

// global thread to keep track of state counters, and keep cached to disk
var stateIt = {};
var stateSynced = 0;

exports.up = function(field){
    if(!stateIt[field]) stateIt[field] = 0;
    stateIt[field]++;
    stateChange(field);
}

exports.down = function(field){
    if(!stateIt[field]) stateIt[field] = 0;
    stateIt[field]--;
    stateChange(field);
}

exports.set = function(field,val){
    stateIt[field] = val;
    stateChange(field);
}

exports.next = function(field, at){
    stateIt[field+'Next'] = at;
    stateUpdated = Date.now();
}

exports.state = function()
{
    return stateIt;
}

exports.init = function()
{
    try{
        stateIt = JSON.parse(fs.readFileSync("state.json"));
    } catch(e){
        stateIt = {};
    }
    stateUpdated = stateSynced = Date.now();
    stateSync();
}

function stateChange(field)
{
    stateIt[field+"Last"] = stateIt["updated"] = stateUpdated = Date.now();    
}

function stateSync()
{
    setTimeout(stateSync,5000); // every 5 sec check for sync
    if(stateUpdated <= stateSynced) return;
    stateSynced = stateUpdated;
    fs.writeFileSync("state.json",JSON.stringify(stateIt));
}

