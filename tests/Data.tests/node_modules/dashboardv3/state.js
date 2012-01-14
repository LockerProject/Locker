var lutil = require('lutil.js')
  , fs = require('fs')
  ;

var state = {
      collectionInfo: {
          link: {name:"link", timer:null, count:0, new:0, updated:0, lastId:0},
          contact: {name:"contact", timer:null, count:0, new:0, updated:0, lastId:0},
          photo: {name:"photo", timer:null, count:0, new:0, updated:0, lastId:0},
          place: {name:"place", timer:null, count:0, new:0, updated:0, lastId:0}
      },
      appInfo: {
          contactsviewer: {lastUsed: 0},
          photosv09: {lastUsed: 0},
          linkalatte: {lastUsed: 0},
          helloplaces: {lastUsed: 0}
      },
      draftApps: {}
};

exports.state = state;

exports.fetchState = function() {
    try {
        fs.statSync('state.json');
        var stateInfo = fs.readFileSync('state.json');
        if (state) {
            exports.state = state = JSON.parse(stateInfo);
            if (!state.draftApps) {
                state.draftApps = {}
            }
        }
    } catch (err) {}
};

exports.saveState = function() {
    lutil.atomicWriteFileSync('state.json', JSON.stringify(state));
};

exports.appClicked = function(clickedApp) {
    if (!state.appInfo.hasOwnProperty(clickedApp)) {
        state.appInfo[clickedApp] = {};
    }
    state.appInfo[clickedApp].lastUsed = new Date().getTime();
    exports.saveState();
};

exports.saveDraft = function(appInfo) {
    state.draftApps[appInfo.app] = appInfo;
    exports.saveState();
}

exports.getNLastUsedApps = function(n) {
    var appArray = [];
    for (var i in state.appInfo) {
        if (state.appInfo.hasOwnProperty(i)) {
            appArray.push({name: i, lastUsed: state.appInfo[i].lastUsed});
        }
    }
    var array = appArray.sort(function(a, b) { return (b.lastUsed - a.lastUsed); });
    if (n) {
        return array.slice(0, n - 1);
    } else {
        return array;
    }
};
