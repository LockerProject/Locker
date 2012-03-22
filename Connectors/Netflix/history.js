var MAX_ITEMS = 250;

exports.sync = require('./lib').genericSync('history', function(pi) {
  return '/users/' + pi.auth.userId + '/rental_history/watched';
}, function(pi) {
  if (!pi.config) {
    pi.config = {};
  }

  if (typeof pi.config.historyStart === 'undefined') {
    pi.config.historyStart = 0;

    return '?max_results=' + MAX_ITEMS;
  }

  return '?max_results=' + MAX_ITEMS + '&start_index=' + pi.config.historyStart;
}, function(pi, js) {
  var items = js.rental_history_item;

  if (!js || !items || items.length === 0) {
    pi.config.historyStart = 0;
    pi.config.nextRun = 0;

    return [];
  }

  if (js.number_of_results &&
    pi.config.historyStart > parseInt(js.number_of_results, 10)) {
    pi.config.historyStart = 0;
    pi.config.nextRun = 0;
  }

  if (items.length < MAX_ITEMS) {
    pi.config.historyStart = 0;
    pi.config.nextRun = 0;
  } else {
    pi.config.historyStart += MAX_ITEMS;
    pi.config.nextRun = -1;
  }

  return items;
});
