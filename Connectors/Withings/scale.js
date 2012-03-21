var MAX_ITEMS = 50;

exports.sync = require('./lib').deviceSync('scale', function(pi) {
  return '/measure';
}, function(pi) {
  if (!pi.config) {
    pi.config = {};
  }

  if (typeof pi.config.scaleStart === 'undefined') {
    pi.config.scaleStart = 0;
  }

  if (pi.config.scaleStart === 0) {
    return '?action=getmeas&devtype=1&limit=' + MAX_ITEMS + '&userid=' + pi.auth.userId;
  }

  return '?action=getmeas&devtype=1&limit=' + MAX_ITEMS + '&offset=' + pi.config.scaleStart + '&userid=' + pi.auth.userId;
}, function(pi, js) {
  var items;

  if (js.body && js.body.measuregrps) {
    items = js.body.measuregrps;
  }

  if (!js || !items || items.length === 0) {
    pi.config.scaleStart = 0;
    pi.config.nextRun = 0;

    return [];
  }

  if (items.length < MAX_ITEMS) {
    pi.config.scaleStart = 0;
    pi.config.nextRun = 0;
  } else {
    pi.config.scaleStart += MAX_ITEMS;
    pi.config.nextRun = -1;
  }

  return items;
});
