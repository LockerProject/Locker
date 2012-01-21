var baseUrl = "https://burrow.singly.com/registry/_design";

var registry = {};
var cache = {};
registry.getAllApps = function(callback) {
  if(cache.allApps) return callback(cache.allApps, true);
  $.getJSON(baseUrl + '/apps/_view/Apps', function(data, success) {
    if(!success) return callback(data, success);
    registry.getAllConnectors(function(connectors, success) {
      data = data.rows;
      var apps = {};
      for(var i in data) apps[data[i].value.name] = data[i].value;
      flagMine(apps, function() {
        cache.allApps = apps;
        callback(apps, success);
      });
    })
  });
}

registry.getApp = function(appName, callback) {
  registry.getAllApps(function(apps) {
    callback(apps[appName]);
  });
}

registry.getByAuthor = function(author, callback) {
  registry.getAllApps(function(apps, success) {
    if(!success) return callback(apps, success);
    var authorsApps = {};
    for(var i in apps) {
      if(apps[i].author.name === author) authorsApps[i] = apps[i];
    }
    callback(authorsApps, success);
  });
}


registry.getByFilter = function(filters, callback) {
  registry.getAllApps(function(apps, success) {
    if(!success) return callback(apps, success);
    var filteredApps = {};
    for(var i in apps) {
      if(isMatch(apps[i].repository.uses, filters)) filteredApps[i] = apps[i];
    }
    callback(filteredApps, success);
  });
}

registry.getAllConnectors = function(callback) {
  if(cache.connectors) return callback(cache.connectors, true);
  $.getJSON(baseUrl + '/connectors/_view/Connectors', function(data, success) {
    if(!success) return callback(data, success);
    data = data.rows;
    var connectors = {};
    for(var i in data) connectors[data[i].value.handle] = data[i].value;
    cache.connectors = connectors;
    callback(connectors, success);
  });
}


function getMyApps(callback, force) {
  if(cache.myApps !== undefined && !force) return callback(cache.myApps, true);
  $.getJSON('/registry/added', function(myApps, success) {
    if(!success) return callback(myApps, success);
    cache.myApps = myApps;
    if(typeof callback === 'function') callback(myApps, success);
  }).error(function() {
    cache.myApps = null;
    if(typeof callback === 'function') callback(null);
  });
}

function flagMine(apps, callback) {
  getMyApps(function(myApps, success) {
    for(var i in apps) {
      if(loggedIn) {
        apps[i].actions = {add:true};
        if(myApps[i]) apps[i].actions.add = false;
      }
    }
    callback();
  });
}

registry.getUnConnectedServices = function(app, callback) {
  if(!app.repository.uses) return callback([]);
  registry.getAllConnectors(function(allConnectors) {
    registry.getMyConnectors(function(myConnectors) {
      if(myConnectors === null) return callback();
      var unconnected = [];
      var svcs = app.repository.uses.services;
      for(var i in svcs) {
        if(!registry.getMyConnectors[svcs[i]] && allConnectors[svcs[i]]) unconnected.push(allConnectors[svcs[i]]);
      }
      callback(unconnected);
    });
  });
}

registry.getMyConnectors = function(callback, force) {
  if(cache.myConnectors !== undefined && !force) return callback(cache.myConnectors, true);
  $.getJSON('/map', function(map, success) {
    if(!success) return callback(map, success);
    var myConnectors = {};
    for(var i in map) if(map[i].type === 'connector') myConnectors[i] = map[i];
    cache.myConnectors = myConnectors;
    if(typeof callback === 'function') callback(myConnectors, success);
  }).error(function() {  
    cache.myConnectors = null;
    if(typeof callback === 'function') callback(null);
  });
}

function isMatch(uses, filters) {
  if(!uses) return false;
  if(filters.services && !arrHasAll(uses.services, filters.services)) return false;
  if(filters.types && !arrHasAll(uses.types, filters.types)) return false;
  return true;
}

function arrHasAll(array, values) {
  if(!values) return true;
  if(!array) return false;
  for(var i in values) if(!arrContains(array, values[i])) return false;
  return true;
}

function arrContains(array, value) {
  for(var i in array) if(array[i] === value) return true;
  return false;
}