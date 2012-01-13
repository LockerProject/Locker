# Service Map Overhaul

## Required Data
* In the map
    * provides
    * uses
    * static
    * accounts
    * handle
    * version
* In the repository
    * screenshot / icon

## TODOs
* Fix areas that use the available list:
    * Apps/DevDocs/static/js/common.js:24:        callback(false, synclets.available);
    * Apps/DevDocs/static/js/common.js:72:    isGitHubConnected(function(isInstalled, available) {
    * Apps/DevDocs/static/js/common.js:77:            for(var i in available) {
    * Apps/DevDocs/static/js/common.js:78:                if(available[i].provider === 'github') {
    * Apps/DevDocs/static/js/common.js:80:                    var url = available[i].authurl;
    * Apps/dashboardv3/dashboard-client.js:117:        for (var i in synclets.available) {
    * Apps/dashboardv3/dashboard-client.js:118:            if (synclets.available[i].authurl) {
    * Apps/dashboardv3/dashboard-client.js:119:                syncletSorted.push({title: synclets.available[i].title, id: synclets.available[i].provider});
    * Apps/dashboardv3/dashboard-client.js:158:                            synclets.available.some(function(info) {
    * Apps/dashboardv3/dashboard-client.js:507:            synclets.available.some(function(synclet) {
    * Apps/dashboardv3/dashboard-client.js:509:                    synclets.available.splice(synclets.available.indexOf(synclet), 1);
    * Apps/dashboardv3/dashboard-client.js:513:        for (var i = 0; i < synclets.available.length; i++) {
    * Apps/dashboardv3/dashboard-client.js:514:            if (oauthPopupSizes[synclets.available[i].provider]) {
    * Apps/dashboardv3/dashboard-client.js:515:                synclets.available[i].oauthSize = oauthPopupSizes[synclets.available[i].provider];
    * Apps/dashboardv3/dashboard-client.js:517:                synclets.available[i].oauthSize = {width: 960, height: 600};
    * Apps/dashboardv3/static/img/www.addictedtocoffee.de/LICENSE.txt:14:1. Copyright and Related Rights. A Work made available under CC0 may be protected by copyright and related or neighboring rights ("Copyright and Related Rights"). Copyright and Related Rights include, but are not limited to, the following:
    * Apps/dashboardv3/views/iframe/exploreApps.ejs:37:                  <% for (var k = 0; k < synclets.available.length; k++) { %>
    * Apps/dashboardv3/views/iframe/exploreApps.ejs:38:                    <% if (synclets.available[k].provider === apps[i].repository.uses.services[j]) { %>
    * Apps/dashboardv3/views/iframe/exploreApps.ejs:42:                      <a href="<%= synclets.available[k].authurl %>" class="oauthLink orange" data-provider="<%= synclets.available[k].provider %>"
    * Apps/dashboardv3/views/iframe/exploreApps.ejs:43:                        data-width="<%= synclets.available[k].oauthSize.width %>"
    * Apps/dashboardv3/views/iframe/exploreApps.ejs:44:                        data-height="<%= synclets.available[k].oauthSize.height %>"><%= synclets.available[k].title %></a>
    * Apps/dashboardv3/views/you.ejs:23:  <% for (var i = 0; i < synclets.available.length; i++) { %>
    * Apps/dashboardv3/views/you.ejs:24:    <% if (synclets.available[i].authurl) { %>
    * Apps/dashboardv3/views/you.ejs:25:      <a href="<%= synclets.available[i].authurl %>" class="oauthLink" data-provider="<%= synclets.available[i].provider %>"
    * Apps/dashboardv3/views/you.ejs:26:         data-width="<%= synclets.available[i].oauthSize.width %>"
    * Apps/dashboardv3/views/you.ejs:27:         data-height="<%= synclets.available[i].oauthSize.height %>"><img src="img/icons/32px/<%= synclets.available[i].provider %>.png"></a>
    * Common/node/lservicemanager.js:22:    available:[],
    * Common/node/lservicemanager.js:75:* Map a meta data file JSON with a few more fields and make it available
    * Common/node/lservicemanager.js:83:    serviceMap.available.push(metaData);
    * Common/node/lservicemanager.js:130:* Scans a directory for available services
    * Common/node/lservicemanager.js:158:    serviceMap.available.some(function(svcInfo) {
    * Common/node/lservicemanager.js:199:    // replace references in available array (legacy)
    * Common/node/lservicemanager.js:201:    serviceMap.available.some(function(svcInfo) {
    * Common/node/lservicemanager.js:207:    if(!found) serviceMap.available.push(metaData);
    * Common/node/lservicemanager.js:311:    serviceMap.available.some(function(svcInfo) {
    * Common/node/lservicemanager.js:406:    for(var i in serviceMap.available) {
    * Common/node/lservicemanager.js:407:        if(serviceMap.available[i].srcdir == svc.srcdir) {
    * Common/node/lservicemanager.js:408:            serviceInfo = serviceMap.available[i];
    * Common/node/lservicemanager.js:553:    serviceMap.available.some(function(svcInfo) {
    * Common/node/lservicemanager.js:571:    for(var i in serviceMap.available) {
    * Common/node/lservicemanager.js:572:        if(serviceMap.available[i].handle === handle)
    * Common/node/lservicemanager.js:573:            return serviceMap.available[i];
    * Common/node/lservicemanager.js:586:    return serviceId in serviceMap.available;
    * Common/node/lsyncmanager.js:37:    available:[],
    * Common/node/lsyncmanager.js:124:    synclets.available.some(function(svcInfo) {
    * Common/node/lsyncmanager.js:266:    // this is a workaround for making synclets available in the map separate from scheduling them which could be done better
    * Common/node/lsyncmanager.js:551:* Map a meta data file JSON with a few more fields and make it available
    * Common/node/lsyncmanager.js:556:    synclets.available.push(metaData);
    * Common/node/lsyncmanager.js:564:        for (var i in synclets.available) {
    * Common/node/lsyncmanager.js:565:            var synclet = synclets.available[i];
    * Ops/webservice-synclets-auth.js:14:    var avail = syncManager.synclets().available;
    * Ops/webservice-synclets-auth.js:75:    var avail = syncManager.synclets().available;
    * Ops/webservice.js:116:locker.get("/available", function(req, res) {
    * Ops/webservice.js:335:        map.available.forEach(function(s){ if(s.handle === id) match = s; });
    * Ops/webservice.js:434:        else res.send("git cmd not available!");
* Fix areas that use installed to use a direct map
    * Apps/BackMeUp/bmu.js:33:        for(var id in map.installed)
    * Apps/BackMeUp/bmu.js:35:            if(map.installed[id].provides && map.installed[id].provides.indexOf("store/s3") >= 0)
    * Apps/DevDocs/static/js/common.js:18:        var installed = synclets.installed;
    * Apps/DevDocs/static/js/common.js:19:        for(var i in installed) {
    * Apps/DevDocs/static/js/common.js:20:            if(installed[i].id === "github") {
    * Apps/PicPipe/picpipe.js:78:        for(var id in map.installed)
    * Apps/PicPipe/picpipe.js:80:            if(map.installed[id].srcdir == "Connectors/WordPress")
    * Apps/PicPipe/ui/index.html:1:<p>First load your <a href="load">photos</a> (flickr only right now, make sure you have it installed/connected and sync'd your photos)
    * Apps/dashboardv3/dashboard-client.js:155:                        if (synclets.installed[req.param('services')[i]]) {
    * Apps/dashboardv3/dashboard-client.js:156:                            data.services[req.param('services')[i]] = synclets.installed[req.param('services')[i]].title;
    * Apps/dashboardv3/dashboard-client.js:340:        for (var i in map.installed) {
    * Apps/dashboardv3/dashboard-client.js:341:            if ((map.installed[i].is === 'app' || map.installed[i].type === 'app') && !map.installed[i].hidden) {
    * Apps/dashboardv3/dashboard-client.js:342:                result.push(map.installed[i]);
    * Apps/dashboardv3/dashboard-client.js:452:            for (var i in map.installed) {
    * Apps/dashboardv3/dashboard-client.js:453:                if (pattern.exec(map.installed[i].srcdir)) {
    * Apps/dashboardv3/dashboard-client.js:454:                    var appInfo = checkDraftState(map.installed[i]);
    * Apps/dashboardv3/dashboard-client.js:481:                    apps[i].installed = true;
    * Apps/dashboardv3/dashboard-client.js:505:        for (var i in synclets.installed) {
    * Apps/dashboardv3/dashboard-client.js:508:                if (synclet.provider === synclets.installed[i].provider) {
    * Apps/dashboardv3/static/css/style.css:155:.sidenav-items .installed {
    * Apps/dashboardv3/static/js/dashboard.js:13:  app = window.location.hash.substring(1) || $('.installed-apps a').data('id') || 'contactsviewer';
    * Apps/dashboardv3/static/js/dashboard.js:95:  link.children('img').addClass('installed').appendTo('.sidenav-items.synclets');
    * Apps/dashboardv3/views/create.ejs:4:<div class="installed-apps sidenav-items">
    * Apps/dashboardv3/views/create.ejs:28:<div class="installed-apps sidenav-items">
    * Apps/dashboardv3/views/create.ejs:38:<div class="installed-apps sidenav-items">
    * Apps/dashboardv3/views/explore.ejs:12:<div class="installed-apps sidenav-items">
    * Apps/dashboardv3/views/iframe/exploreApps.ejs:36:                <% if (!synclets.installed[j]) { %>
    * Apps/dashboardv3/views/iframe/exploreApps.ejs:54:            <% if (apps[i].installed) { %>
    * Apps/dashboardv3/views/iframe/registryApp.ejs:18:            <% if (app.installed) { %>
    * Apps/dashboardv3/views/you.ejs:5:<div class="installed-apps sidenav-items">
    * Apps/dashboardv3/views/you.ejs:30:  <% for (var i in synclets.installed) { %>
    * Apps/dashboardv3/views/you.ejs:31:    <img class='installed' src="img/icons/32px/<%= synclets.installed[i].provider %>.png"></a>
    * Common/node/lservicemanager.js:24:    installed:{},
    * Common/node/lservicemanager.js:34:    if (sterilized.installed) {
    * Common/node/lservicemanager.js:35:        for (var i in sterilized.installed) {
    * Common/node/lservicemanager.js:36:            delete sterilized.installed[i].port;
    * Common/node/lservicemanager.js:37:            delete sterilized.installed[i].uriLocal;
    * Common/node/lservicemanager.js:38:            delete sterilized.installed[i].pid;
    * Common/node/lservicemanager.js:39:            delete sterilized.installed[i].startingPid;
    * Common/node/lservicemanager.js:48:    for(var svcId in serviceMap.installed) {
    * Common/node/lservicemanager.js:49:        if (!serviceMap.installed.hasOwnProperty(svcId))  continue;
    * Common/node/lservicemanager.js:50:        var service = serviceMap.installed[svcId];
    * Common/node/lservicemanager.js:103:                serviceMap.installed[metaData.id] = metaData;
    * Common/node/lservicemanager.js:208:    // update any "installed"
    * Common/node/lservicemanager.js:209:    if(type && type === "install" && !serviceMap.installed[metaData.handle])
    * Common/node/lservicemanager.js:213:    if(serviceMap.installed[metaData.handle]) return serviceMap.installed[metaData.handle] = lutil.extend(serviceMap.installed[metaData.handle], metaData);
    * Common/node/lservicemanager.js:221:    serviceMap.installed = {};
    * Common/node/lservicemanager.js:234:                serviceMap.installed[js.id] = js;
    * Common/node/lservicemanager.js:239:                    js = serviceMap.installed[js.id] = exports.migrate(dir, js);
    * Common/node/lservicemanager.js:263:exports.migrate = function(installedDir, metaData) {
    * Common/node/lservicemanager.js:277:                    var ret = migrate(installedDir); // prolly needs to be sync and given a callback someday
    * Common/node/lservicemanager.js:352:    serviceMap.installed[meInfo.id] = mergedManifest(path.join(lconfig.me, meInfo.id));
    * Common/node/lservicemanager.js:511:        if (!svc.uninstalled) {
    * Common/node/lservicemanager.js:549:    var installedInfo = serviceMap.installed[serviceId] || {};
    * Common/node/lservicemanager.js:551:    logger.debug(installedInfo);
    * Common/node/lservicemanager.js:554:        if (svcInfo.srcdir == installedInfo.srcdir) {
    * Common/node/lservicemanager.js:565:    serviceMap.installed[serviceId] = lutil.extend(serviceInfo, installedInfo);
    * Common/node/lservicemanager.js:567:    return serviceMap.installed[serviceId];
    * Common/node/lservicemanager.js:582:    return serviceId in serviceMap.installed;
    * Common/node/lservicemanager.js:600:    for(var mapEntry in serviceMap.installed) {
    * Common/node/lservicemanager.js:601:        var svc = serviceMap.installed[mapEntry];
    * Common/node/lservicemanager.js:617:    var svc = serviceMap.installed[id];
    * Common/node/lservicemanager.js:637:    var svc = serviceMap.installed[serviceId];
    * Common/node/lservicemanager.js:650:            svc.uninstalled = true;
    * Common/node/lservicemanager.js:655:            delete serviceMap.installed[serviceId];
    * Common/node/lservicemanager.js:666:    for(var i in serviceMap.installed) {
    * Common/node/lservicemanager.js:667:        if(serviceMap.installed[i].id === id) {
    * Common/node/lservicemanager.js:668:            svc = serviceMap.installed[i];
    * Common/node/lservicemanager.js:687:    for(var mapEntry in serviceMap.installed) {
    * Common/node/lservicemanager.js:688:        var svc = serviceMap.installed[mapEntry];
    * Common/node/lsyncmanager.js:38:    installed:{},
    * Common/node/lsyncmanager.js:48:    for(var svcId in synclets.installed) {
    * Common/node/lsyncmanager.js:49:        if (!synclets.installed.hasOwnProperty(svcId))  continue;
    * Common/node/lsyncmanager.js:50:        var service = synclets.installed[svcId];
    * Common/node/lsyncmanager.js:75:* Scans the Me directory for installed synclets
    * Common/node/lsyncmanager.js:90:                synclets.installed[js.id] = js;
    * Common/node/lsyncmanager.js:91:                synclets.installed[js.id].status = "waiting";
    * Common/node/lsyncmanager.js:148:    synclets.installed[serviceInfo.id] = serviceInfo;
    * Common/node/lsyncmanager.js:161:    return serviceId in synclets.installed;
    * Common/node/lsyncmanager.js:165:    return synclets.installed[serviceId];
    * Common/node/lsyncmanager.js:174:    if (!synclets.installed[serviceId]) return callback("no service like that installed");
    * Common/node/lsyncmanager.js:175:    async.forEach(synclets.installed[serviceId].synclets, function(synclet, cb) {
    * Common/node/lsyncmanager.js:182:        executeSynclet(synclets.installed[serviceId], synclet, cb, true);
    * Common/node/lsyncmanager.js:188:    async.forEach(Object.keys(synclets.installed), function(service, cb){ // do all services in parallel
    * Common/node/lsyncmanager.js:189:        async.forEachSeries(synclets.installed[service].synclets, function(synclet, cb2) { // do each synclet in series
    * Common/node/lsyncmanager.js:192:            executeSynclet(synclets.installed[service], synclet, cb2);
    * Common/node/lsyncmanager.js:519:exports.migrate = function(installedDir, metaData) {
    * Common/node/lsyncmanager.js:532:                    if (migrate(installedDir)) {
    * Common/node/lsyncmanager.js:533:                        var curMe = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, installedDir, 'me.json'), 'utf8'));
    * Common/node/lsyncmanager.js:536:                        lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, installedDir, 'me.json'),
    * Ops/registry.js:24:var installed = {};
    * Ops/registry.js:56:                callback(installed);
    * Ops/registry.js:84:        copy.installed = installed[id];
    * Ops/registry.js:171:// just load up any installed packages in node_modules
    * Ops/registry.js:192:            installed[js.name] = js;
    * Ops/registry.js:198:             callback(null, installed[name]);
    * Ops/registry.js:224:                // if installed and autoupdated and newer, do it!
    * Ops/registry.js:225:                if(installed[k] && body[k].repository && body[k].repository.update == 'auto' && semver.lt(installed[k].version, body[k]["dist-tags"].latest))
    * Ops/registry.js:240:    return installed;
    * Ops/registry.js:278:        loadPackage(arg.name, callback); // once installed, load
    * Ops/regtest.js:9:reg.init(lconfig, lcrypto, function(installed){
    * Ops/regtest.js:10:    logger.verbose("installed list: "+Object.keys(installed).join(","));
    * Ops/regtest.js:14:           logger.error("installed err("+err+")");
    * Ops/regtest.js:21:       logger.error("installed err("+err+")");
    * Ops/webservice-synclets.js:11:        for(var s in synclets.installed) {
    * Ops/webservice-synclets.js:12:            delete synclets.installed[s].config;
    * Ops/webservice-synclets.js:13:            delete synclets.installed[s].auth;
    * Ops/webservice.js:108:    var services = serviceManager.serviceMap().installed;
    * Ops/webservice.js:109:    var synclets = syncManager.synclets().installed;
    * Ops/webservice.js:161:        var providers = serviceManager.serviceMap().installed;
    * Ops/webservice.js:291:// all of the requests to something installed (proxy them, moar future-safe)
    * Ops/webservice.js:313:// all of the requests to something installed (proxy them, moar future-safe)
* Check everything that uses provides
    * Apps/BackMeUp/bmu.js:35:            if(map.installed[id].provides && map.installed[id].provides.indexOf("store/s3") >= 0)
    * Apps/UseUI/static/js/dashboard.js:103:    var htmlProvides = item["provides"] ? item["provides"].join(", ") : '';
    * Collections/Contacts/contacts.collection:7:    "provides":["contact"],
    * Collections/Contacts/sync.js:37:                    if(svc.provides.indexOf('contact/facebook') >= 0) {
    * Collections/Contacts/sync.js:41:                    } else if(svc.provides.indexOf('contact/twitter') >= 0) {
    * Collections/Contacts/sync.js:45:                    } else if(svc.provides.indexOf('contact/flickr') >= 0) {
    * Collections/Contacts/sync.js:49:                    } else if(svc.provides.indexOf('contact/gcontacts') >= 0) {
    * Collections/Contacts/sync.js:53:                    } else if(svc.provides.indexOf('contact/foursquare') >= 0) {
    * Collections/Contacts/sync.js:57:                    } else if(svc.provides.indexOf('contact/instagram') >= 0) {
    * Collections/Contacts/sync.js:61:                    } else if(svc.provides.indexOf('contact/github') >= 0) {
    * Collections/Links/dataIn.js:26:                if(svc.provides.indexOf('link/facebook') >= 0) {
    * Collections/Links/dataIn.js:34:                } else if(svc.provides.indexOf('timeline/twitter') >= 0) {
    * Collections/Links/links.collection:7:    "provides":["link"],
    * Collections/Messages/messages.collection:7:    "provides":["message"]
    * Collections/Photos/photos.collection:7:    "provides":["photo"],
    * Collections/Photos/sync.js:45:                    svc.provides.forEach(function(providedType) {
    * Collections/Photos/sync.js:75:function basicPhotoGatherer(svcId, type, provides) {
    * Collections/Places/places.collection:7:    "provides":["place"],
    * Collections/Search/search.collection:7:    "provides":["search"],
    * Collections/Videos/videos.collection:7:    "provides":["video"]
    * Common/node/lservicemanager.js:51:        if (!service.hasOwnProperty("provides")) continue;
    * Common/node/lservicemanager.js:52:        if (service.provides.some(function(svcType, index, actualArray) {
    * Common/node/lsyncmanager.js:51:        if (!service.hasOwnProperty("provides")) continue;
    * Common/node/lsyncmanager.js:52:        if (service.provides.some(function(svcType, index, actualArray) {
    * Connectors/AmazonS3/s3.connector:8:    "provides":["store/s3"]
    * Connectors/Dropbox/dropbox.connector:8:    "provides":["store/dropbox"]
    * Connectors/Facebook/facebook.connector:9:  "provides":["contact/facebook", "link/facebook", "photo/facebook"]
    * Connectors/Facebook/facebook.synclet:4:    "provides":["contact/facebook", "photo/facebook", "link/facebook", "home/facebook"],
    * Connectors/FirefoxHistory/firefoxHistory.connector:7:	"provides":["link/firefox"]
    * Connectors/FitBit/fitbit.connector:9:    "provides":["device/fitbit"]
    * Connectors/FitBit/migrations/1311006153638.js:8:    me.provides = ["device/fitbit"];
    * Connectors/Flickr/flickr.synclet:4:    "provides":["contact/flickr", "photo/flickr"],
    * Connectors/GitHub/github.synclet:22:    "provides": [
    * Connectors/GoodReads/goodReads.connector:8:    "provides":["books/book"],
    * Connectors/GoogleContacts/googleContacts.synclet:4:    "provides":["contact/gcontacts"],
    * Connectors/GoogleLatitude/GoogleLatitude.connector:8:	"provides":["location/latitude"]
    * Connectors/GoogleLatitude/GoogleLatitude.synclet:11:    "provides": [
    * Connectors/GooglePlus/gplus.synclet:5:    "provides":["activitiy/gplus"],
    * Connectors/Gowalla/gowalla.synclet:5:    "provides": ["friend/gowalla", "checkin/gowalla", "pin/gowalla"],
    * Connectors/IMAP/IMAP.connector:9:	"provides":["message/imap"]
    * Connectors/Instagram/manifest.synclet:8:    "provides":["profile/instagram","photo/instagram","contact/instagram","feed/instagram"],
    * Connectors/Linkedin/linkedin.connector:8:	"provides":["contact/linkedin"]
    * Connectors/SimpleJournal/simplejournal.connector:8:	"provides":["journal/simple"]
    * Connectors/SoundCloud/SoundCloud.synclet:4:    "provides":["track/soundcloud", "contact/soundcloud"],
    * Connectors/Tumblr/tumblr.synclet:5:    "provides":["dashboard/tumblr","post/tumblr","contact/tumblr"],
    * Connectors/Twitpic/twitpic.connector:8:    "provides":["photo/twitpic"]
    * Connectors/Twitter/twitter.synclet:5:    "provides":["contact/twitter", "mentions/twitter", "related/twitter", "timeline/twitter", "tweets/twitter"],
    * Connectors/TwitterSearch/tsearch.connector:8:    "provides":["status/twittersearch"]
    * Connectors/Wakemate/wakemate.connector:9:	"provides":["journal/wakemate"]
    * Connectors/WordPress/WordPress.connector:8:  "provides":["blog/wordpress", "category/wordpress", "post/wordpress", "comment/wordpress"]
    * Connectors/XMPP/XMPP.connector:8:	"provides":["message/XMPP","status/XMPP"]
    * Connectors/foursquare/foursquare.synclet:30:    "provides": [
    * Connectors/skeleton/skeleton.connector:9:    "provides":["here you will list the service types exposed by the connector"]
    * Docs/notes.txt:6:	provides data dirs on installing new services
    * Docs/notes.txt:7:	provides local port assignments
    * Ops/static/static/js/jquery.mobile-1.0b2.js:1320://         $(window).hashchange() like jQuery provides for built-in events.
    * Ops/static/static/js/jquery.mobile-1.0b2.js:1338://         extra awesomeness that BBQ provides. This plugin will be included as
    * Ops/webservice.js:107:locker.get("/provides", function(req, res) {
    * Ops/webservice.js:111:    for(var i in services) ret[i] = services[i].provides;
    * Ops/webservice.js:112:    for(var i in synclets) ret[i] = synclets[i].provides;
    * Ops/webservice.js:164:            if (providers.hasOwnProperty(key) && providers[key].provides && providers[key].provides.indexOf(query.collection) >= 0 )
* Inspect any files that use lservicemanager
    * Common/node/levents.js:14:var serviceManager = require("lservicemanager");
    * Common/node/lscheduler.js:12:var serviceManager = require("lservicemanager");
    * Common/node/lservicemanager.js:30:logger.info('lservicemanager lockerPortNext = ' + lockerPortNext);
    * Ops/webservice.js:16:var serviceManager = require("lservicemanager");
    * _lockerd.js:54:    var serviceManager = require("lservicemanager");
* Create unit tests 
    * service manager
    * synclet manager
    * registry

## Important Notes
* lconfig contains a list of the preinstalled packages
    * Collections
    * Defaults Apps
    * All connectors are in the registry
* The service map can b saved and loaded for startup speedups
    * Once the startup is complete the system can async scan for new entries, during this time holding any inbound attempts to connect to an unknown handle
