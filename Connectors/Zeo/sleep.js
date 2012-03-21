var async = require('async'),
    lib = require('./lib');

exports.sync = lib.genericSync('sleep', function(pi) {
  return '/sleeperService/getAllDatesWithSleepData';
}, function(pi) {
  return '?key=' + pi.auth.appKey;
}, function(pi, js, cb) {
  var dates = js.response.dateList.date;

  if (!js || !dates) {
    return [];
  }

  // For each date with a sleep record...
  async.mapSeries(dates, function(date, mapped) {
    // Retrieve the record...
    lib.callApi(pi, function(data) {
      var js;

      try {
        js = JSON.parse(data);
      } catch(E) {
        mapped(E);
      }

      var record = js.response.sleepRecord;

      if (!js || !record) {
        mapped();
      }

      record.id = record.startDate.year + '-' +
        record.startDate.month + '-' +
        record.startDate.day;

      mapped(null, record);
    }, function(pi) {
      return '/sleeperService/getSleepRecordForDate';
    }, function(pi) {
      return '?key=' + pi.auth.appKey + '&date=' + date.year + '-' + date.month + '-' + date.day;
    });
  }, function(err, results){
    // And return them all up the chain.
    cb(results);
  });
});
