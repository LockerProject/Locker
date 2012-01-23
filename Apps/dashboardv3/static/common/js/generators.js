function generateAppsHtml(apps, callback, html) {
  if(!html) html = '';
  if(!apps || apps.length <= 0) return callback(html);
  var app = apps.shift();
  registry.getUnConnectedServices(app, function(unconnected) {
    dust.render('app', {app:app, connect:unconnected}, function(err, appHtml) {
      html += appHtml;
      generateAppsHtml(apps, callback, html);
    });
  });
}

function generateAppDetailsHtml(app, callback) {
  app.updated = moment(new Date(app.time.modified)).fromNow();
  // if(app.repository.uses) {
  //     var types = [];
  //     for(var i in app.repository.uses.types) types.push(prettyName(app.repository.uses.types[i]));
  //     app.repository.uses.types = types;
  // }
  registry.getUnConnectedServices(app, function(unconnected) {
    dust.render('appDetails', {app:app, connect:unconnected}, function(err, appHtml) {
      callback(appHtml);
    });
  });
}

function generateBreadCrumbs(breadcrumbs, callback) {
  dust.render('breadcrumbs', breadcrumbs, function(err, appHtml) {
    callback(appHtml);
  });
}
