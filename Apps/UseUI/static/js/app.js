function log(m) { if (console && console.log) console.log(m); }
var app, timeout, appId;
var providers = [];
var manuallyClosed = false;
var retryTime = 1000;

$(document).ready(
    function() {
        // any mouse activity resets it
        $(document).mousemove( function() {
            retryTime = 1000;
        } );

        app = window.location.hash.substring(1);

        $('.app-select').click(function() {
            $('.app-select').toggleClass('on');
            $('.children').toggle();
        });

        $('.app-link').click(function() {
            app = $(this).attr('id');
            window.location.hash = app;
            renderApp();
            return false;
        });

        // open service drawer button
        $('.services-box').click(function() {
            expandServices();
        });

        // close service drawer button
        $('#service-closer').click(function() {
            manuallyClosed = true;
            $('#appFrame').animate({height: $('#appFrame').height() + 110}, {duration: 200, queue: false});
            $('#services').animate({height: "0px"}, {duration: 200, queue: false, complete:function() {
                    $('.services-box-container').show();
                    resizeFrame();
                }
            });
        });

        // service buttons
        $('#service-selector').delegate('.provider-link', 'click', function() {
            if ($(this).hasClass('disabled')) return false;
            accountPopup($(this));
            return false;
        });

        // search box
        $('#nav-search').submit(function() {
            var inputText = $("#nav-search .search").val();
            $("#nav-search .search").val("");
            window.location.hash = "search";
            $('.selected').removeClass('selected');
            $("#appFrame")[0].contentWindow.location.replace("/Me/searchapp/search?type=&searchterm="+inputText);
            return false;
        });

        $(".app-link[title]").tooltip({
            position:"bottom center",
            predelay:750,
            onBeforeShow: function(ev) {
                var id = this.getTrigger().attr("id");
                // Chop off the s!
                id = id.substring(0, id.length - 1);
                var tip = $('.' + id + 'sTotalCount').text() + '<br /><div class="lastUpdated">';
                if (allCounts[id] && allCounts[id].lastUpdate) {
                    var timeDiff = Date.now() - allCounts[id].lastUpdate;
                    if (timeDiff < 60000) {
                        tip += 'last updated less than a minute ago';
                    } else if (timeDiff < 3600000) {
                        tip += 'last updated ' + Math.floor(timeDiff / 60000) + ' minutes ago';
                    } else if (timeDiff < 43200000) {
                        tip += 'last updated over an hour ago';
                    } else if (timeDiff < 43800000) {
                        tip += 'last updated ' + Math.floor(timeDiff / 3600000) + ' hours ago';
                    } else {
                        var d = new Date;
                        d.setTime(allCounts[id].lastUpdate);
                        //log(allCounts);
                        tip += 'last updated ' + d.toString();
                    }
                    tip += '</div>';
                }
                this.getTip().html('<div>' + tip + '</div>');
            }
        });

        renderApp();

        $(window).resize(resizeFrame);
        resizeFrame();
    }
);

/*
 * SyncletPoll
 */
var SyncletPoll = (
    function () {
        var spinnerOpts = {
            lines: 12,
            length: 5,
            width: 3,
            radius: 8,
            trail: 60,
            speed: 1.0,
            shadow: false
        };

        var SyncletPoll = function () {
            var t = this;
            t.uri = "/synclets";
            t.repoll = true;
            t.installed = {};

            var app = {};

            t.updateState = function(provider, state) {
                var b =  {
                    "lastState": "",
                    "state": state,
                    "$el": $("#"+provider+"connect")
                };

                // use the existing object if it exists
                if (typeof(t.installed[provider]) != "undefined") {
                    b.$el.find('a').addClass("disabled");
                    b = t.installed[provider];
                    b.state = state;
                }

                if (b.lastState == b.state) return;

                // log("["+provider+"] " + state);

                if (b.state == "running" || b.state == "processing data") {
                    if (typeof(b.spinner) == "undefined" && !(b.$el.find('.checkmark').is(':visible'))) {
                        var target = b.$el.find(".spinner")[0];
                        b.$el.find('a').addClass("disabled");
                        b.spinner = new Spinner(spinnerOpts).spin(target);
                    } else if (!(b.$el.find('.checkmark').is(':visible'))) {
                        b.spinner.spin();
                    }
                } else if (b.state == "waiting") {
                    if (b.spinner) b.spinner.stop();
                    b.$el.find('.checkmark').show();
                }

                b.lastState = b.state;
                t.installed[provider] = b;
            };

            t.handleResponse = function(data, err, resp) {
                if(retryTime < 10000) retryTime += 500;
                for (app in data.installed) {
                    app = data.installed[app];

                    if (providers.indexOf(app.provider) != -1) {
                        // update app button with "pending" gfx
                        t.updateState(app.provider, app.status);
                    }
                }

                if (t.repoll) t.timeout = setTimeout(t.query, retryTime);
            };

            t.query = function() {
                var url = t.uri;
                $.ajax({
                           url: url,
                           dataType: 'json',
                           success: t.handleResponse,
                           error: function(e) {
                               // assume it will become available later
                               t.timeout = setTimeout(t.query, 3000);
                           }
                       });
            };

            t.halt = function() {
                t.repoll = false;
                clearTimeout(t.timeout);
            };

            // init
            t.query();
        };

        return function () {
            return new SyncletPoll();
        };

    })();

function drawServices() {
    $.getJSON('/available?handle=' + appId, function(data) {
        $.getJSON('/synclets', function(synclets) {
            $('.service:not(.template)').remove();
            providers = [];
            for (var i in data.uses) {
                for (var j = 0; j < synclets.available.length; j++) {
                    if (synclets.available[j].provider === data.uses[i]) {
                        if(synclets.available[j].authurl) {
                            providers.push(data.uses[i]);
                            drawService(synclets.available[j]);
                        }
                    }
                }
            }
            if (!window.syncletPoll) {
                window.syncletPoll = new SyncletPoll(providers);
            } else {
                window.syncletPoll.halt();
                delete window.syncletPoll;
                window.syncletPoll = new SyncletPoll(providers);
            }
        });
    });
}

function drawService(synclet) {
    var newService = $('.service.template').clone();
    newService.find('.provider-icon').attr('src', 'img/icons/' + synclet.provider + '.png');
    newService.find('.provider-link').attr('href', synclet.authurl).data('provider', synclet.provider);
    newService.find('.provider-name').text(synclet.provider);
    newService.removeClass('template');
    newService.attr('id', synclet.provider + 'connect');
    $('#service-selector').append(newService);
};

// this needs some cleanup to actually use the proper height + widths
function accountPopup (elem) {
    var width = 620;
    var height = 400;
    var oauthPopupSizes = {foursquare: {height: 540,  width: 960},
                 github: {height: 1000, width: 1000},
                 twitter: {width: 630, height: 500},
                 tumblr: {width: 630, height: 500},
                 facebook: {width: 980, height: 705},
                 flickr: {width: 1000, height: 877}
                };
    if (oauthPopupSizes[elem.data('provider')]) {
        width = oauthPopupSizes[elem.data('provider')].width;
        height = oauthPopupSizes[elem.data('provider')].height;
    }
    var popup = window.open(elem.attr('href'), "account", "width=" + width + ",height=" + height + ",status=no,scrollbars=no,resizable=no");
    popup.focus();
}

function renderApp() {
    var ready = false;

    if (timeout) clearTimeout(timeout);
    $('.selected').removeClass('selected');
    $("#" + app).addClass('selected');
    $.getJSON('apps', function(data) {
        var ready = false;
        if (!data[app]) return;
        appId = data[app].id;
        drawServices();
        (function poll (data) {
            $.getJSON("/Me/" + app + "/state", function(state) {
                ready = state.count > 0;
                if (ready) {
                    // log('clearing timeout');
                    $("#appFrame")[0].contentWindow.location.replace(data[app].url);
                    clearTimeout(timeout);
                }
                else {
                    if (!manuallyClosed && $('#services').height() === 0) expandServices();
                    var currentLocation = $("#appFrame")[0].contentWindow.location;
                    var newLocation = data[app].url + "notready.html";
                    if (currentLocation.toString() !== newLocation)
                        currentLocation.replace(newLocation);
                    clearTimeout(timeout);
                    timeout = setTimeout(function() {poll(data);}, 1000);
                    // log(timeout);
                }
            });
        })(data);
    });
};

function expandServices() {
    $('.services-box-container').hide();
    $('#appFrame').animate({height: $('#appFrame').height() - 110}, {duration: 200, queue: false});
    $('#services').animate({height: "110px"}, {duration: 200});
}

function resizeFrame() {
    $('#appFrame').height($(window).height() - $('#services').height() - $('.header').height() - 6);
    $("#appFrame").width($(window).width());
}
