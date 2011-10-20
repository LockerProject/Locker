var debug = false;
var log = function(m) { if (debug && console && console.log) console.log(m); }
var app, timeout, appId, installed;
var providers = [];
var manuallyClosed = false;
var retryTime = 1000;
var ready = false;
var searchWaiting = false;
var searchInterval;
var searchSelector = '.search-header-row:not(.template),.search-result-row:not(.template)';
if ( ! window.location.origin) window.location.origin = window.location.protocol+"//"+window.location.host;
var externalBase = window.location.origin;

var _gaq = [['_setAccount', 'UA-22812443-1'], ['_trackPageview']];;

$(document).ready(
    function() {
        // any mouse activity resets it
        $(document).mousemove( function() {
            retryTime = 1000;
        } );

        app = window.location.hash.substring(1) || "contacts";

        $('.app-select').click(function() {
            $('.app-select').toggleClass('on');
            $('.children').toggle();
        });

        $('.app-link').click(function() {
            app = $(this).attr('id');
            if ($("#services:visible").length > 0) closeServices(0);
            window.location.hash = app;
            $('.devdocs-box-container.active').removeClass('active');
            renderApp();
            return false;
        });

        $(".buttonCounter").mouseenter(function() {
            $("div.appMenu").not(".hoveredViews .appMenu").hide();
            $(".buttonCounter").removeClass("hoveredViews");

            var that = this;
            var E = $(this).next("div.appMenu");
            E.mouseleave(function() {
                $(that).removeClass("hoveredViews");
                E.hide();
            })
            E.css("left", $(this).position().left + 5 - E.width());
            E.css("top", $(this).parent().offset().top + $(this).parent().height())
            $(this).addClass("hoveredViews");
            E.slideDown();
        });

        // service buttons
        $('#service-selector').delegate('.provider-link', 'click', function() {
            if ($(this).hasClass('disabled')) return false;
            accountPopup($(this));
            return false;
        });

        // open service drawer button
        $('.services-box').click(function() {
          if ($("#services:visible").length > 0)
            closeServices();
          else
            expandServices();
        });

        $('.devdocs-box').click(function() {
            $("#appFrame")[0].contentWindow.location.replace("/Me/devdocs/");
            $('.devdocs-box-container').addClass('active');
            $('.app-link.selected').removeClass('selected');
            return false;
        });

        $('#search-results').delegate(searchSelector, 'mouseover', function() {
            $('.highlighted').removeClass('highlighted');
            $(this).addClass('highlighted');
        }).delegate(searchSelector, 'mouseleave', function() {
            $(this).removeClass('highlighted');
        }).delegate(searchSelector, 'click', function() {
            $('#search-results').fadeOut();
        });

        // disable pass through click events when an area is blurred
        $('.blur').click(function() {
            return false;
        });

        $('.search').blur(function(){
            $('#search-results').fadeOut();
        });

        $('.search').focus(function() {
            if ($('.search')[0].value.length > 0) $('#search-results').fadeIn();
            window.setTimeout(function() {
              $('.search')[0].select();
            }, 100);
        });

        $('.search').keyup(function(e) {
            if (e.keyCode == 13) {
                $('.highlighted').click();
                $('#search-results').fadeOut();
                return false;
            } else if (e.keyCode == 38) {
                var selected = $('#search-results').children('.highlighted');
                $('#search-results').children('.highlighted').removeClass('highlighted');
                if (selected.prevAll(':not(.search-divider):visible').first().length > 0) {
                    selected.prevAll(':not(.search-divider):visible').first().addClass('highlighted');
                } else {
                    $('#search-results').children(':not(.search-divider):visible').last().addClass('highlighted');
                }
                return false;
            } else if (e.keyCode == 40) {
                var selected = $('#search-results').children('.highlighted');
                $('#search-results').children('.highlighted').removeClass('highlighted');
                if (selected.nextAll(':not(.search-divider):visible').first().length > 0) {
                    selected.nextAll(':not(.search-divider):visible').first().addClass('highlighted');
                } else {
                    $('#search-results').children(':not(.search-divider):visible').first().addClass('highlighted');
                }
                return false;
            } else {
                if ($('.search')[0].value.length == 0) {
                    $('#search-results').fadeOut();
                    $('.search').removeClass('populated');
                } else {
                    search();
                }
            }
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
                        log(allCounts);
                        tip += 'last updated ' + d.toString();
                    }
                    tip += '</div>';
                }
                this.getTip().html('<div>' + tip + '</div>');
            }
        });

        var viewersFullDisplay = false;
        $("#viewers-hide-show").click(function() {
            if ($('#viewers-title').is(':visible')) {
                hideViewers();
            } else {
                openViewers();
            }
        });

        renderApp();

        resizeFrame();
    }
);

/*
 * Search stuff
 */
var searchTerm;
function search() {
    var q = searchTerm = $('.search')[0].value;
    var baseURL = '/Me/search/query';
    var star = (q.length < 3 || q.substr(-1) == ' ') ? "" : "*";
    $.get(baseURL, {q: q + star, type: 'contact/full*', limit: 3}, function(results) {
        processResults('people', resXform(results), q);
    });
    $.get(baseURL, {q: q + star, type: 'photo/full*', limit: 3}, function(results) {
        processResults('photos', resXform(results), q);
    });
    $.get(baseURL, {q: q + star, type: 'timeline/twitter*', limit: 3}, function(results) {
        processResults('tweets', resXform(results), q);
    });
    $.get('/Me/links/search', {q: q + star, limit: 3}, function(otherData) {
        processResults('links', otherData, q);
    });
}

function resXform(res) {
    if(!res || !res.hits || !res.hits.length) return [];
    return res.hits;
}

function processResults(name, results, query) {
    if(query != searchTerm) return; // bail if search changed!
    var ids = {};
    if (results !== undefined && results.length > 0) {
        for (var i = 0; i < $('.search-result-row.' + name).length; i++) {
            ids[$($('.search-result-row.' + name)[i]).attr('id')] = true;
        }
        updateHeader(name, query);
        for (var i = 0; i < results.length; i++) {
            if (results[i] !== undefined) {
                var obj = results[i];
                delete ids[obj._id];
                if ($('#' + obj._id + '.' + name).length === 0) {
                    if (renderRow(name, obj) === false) {
                        results.splice(i, 1);
                        i--;
                    }
                }
            }
        }
        for (var i in ids) {
            $('#' + i + '.' + name).remove();
        }
    } else {
        $('.search-header-row.' + name).hide();
        $('.search-result-row.' + name).remove();
    }

    $('#search-results').fadeIn();

    if ($('.search-result-row:not(.template)').length > 0) {
      $('#search-results').removeClass("no-results");
        $('.search').addClass('populated');
        if ($('.highlighted').length === 0) {
            $('#search-results').find('.search-result-row:not(.template)').first().addClass('highlighted');
        }
    } else {
        // $('#search-results').fadeOut();
      $('.search').removeClass('populated');
      $('#search-results').addClass("no-results");
    }
}

function updateHeader(name, query) {
    var header = $('.search-header-row.' + name);
    header.find('span').text("");
    header.show();
    header.unbind('click');
    header.click(function() { app = $(this).data('app'); renderApp('search-' + query); });
}

function renderRow(name, obj) {
    var newResult = $('.search-result-row.template').clone();
    newResult.removeClass('template');
    newResult.addClass(name);
    newResult.attr('id', obj._id);
    if (resultModifiers[name](newResult, obj) === false) {
        return false;
    }
    $('.search-header-row.' + name).after(newResult);
}

var resultModifiers = {};

resultModifiers.people = function(newResult, obj) {
    newResult.children('.search-result').html(obj.fullobject.name);
    if (obj.fullobject['photos']) {
        newResult.find('.search-result-icon').attr('src', obj.fullobject.photos[0]);
    } else {
        newResult.find('.search-result-icon').attr('src', '/static/img/silhouette.png');
    }
    newResult.click(function() { app = 'contacts'; renderApp('view-' + obj._id); });
}

resultModifiers.photos = function(newResult, obj) {
    newResult.children('.search-result').html(obj.fullobject.title);
    newResult.find('.search-result-icon').attr('src', obj.fullobject['thumbnail'] || obj.fullobject['url']);
    var img = newResult.find('.search-result-icon')[0];
    img.onload = function() {
        if (this.clientWidth > 36) {
            var left = (this.clientWidth - 36) / 2;
            $(this).css('left', left * -1);
        }
    }
    newResult.click(function() { app = 'photos'; renderApp('view-' + obj._id); });
}

resultModifiers.links = function(newResult, obj) {
    if (obj.title === undefined) {
        return false;
    }
    newResult.attr('title', obj.title);
    newResult.children('.search-result').html(obj.title);
    newResult.find('.search-result-icon').attr('src', obj.favicon || 'img/link.png').addClass("favicon");
    newResult.click(function() { window.open(obj.link,'_blank'); });
}

resultModifiers.tweets = function(newResult, obj) {
    newResult.attr('title', obj.fullobject.text);
    newResult.children('.search-result').html(obj.fullobject.text);
    newResult.find('.search-result-icon').attr('src', obj.fullobject.user.profile_image_url_https);
    newResult.click(function() { window.open('https://www.twitter.com/' + obj.fullobject.user.screen_name + '/status/' + obj.fullobject.id_str, '_blank'); });
}

/*
 * SyncletPoll
 */
var SyncletPoll = (
    function () {
        var SyncletPoll = function () {
            var t = this;
            t.uri = "/synclets";
            t.repoll = true;
            t.installed = {};

            var app = {};

            t.updateState = function(provider, app) {
                var b =  {
                    "$el": $("#"+provider+"connect")
                };

                if (typeof(t.installed[provider]) != "undefined") {
                    b = t.installed[provider];
                } else {
                    t.installed[provider] = b;
                    b.$el.find('a').addClass("disabled");
                }

                if (app.finishedOnce) {
                    b.$el.find('.checkmark').show();
                }
            };

            t.handleResponse = function(data, err, resp) {
                if(retryTime < 10000) retryTime += 500;
                var hasProps = false;
                for (app in data.installed) {
                    hasProps = true;
                    app = data.installed[app];

                    if (providers.indexOf(app.provider) != -1) {
                        // update app button with "pending" gfx
                        t.updateState(app.provider, app);
                    }
                }
                if(!installed || (!installed.github && data.installed.github)) drawViewers(); // add it whenever it loads first time
                installed = data.installed;
                if (!hasProps && !window.guidedSetup) {
                    window.guidedSetup = new GuidedSetup();
                }
                if (ready === false && hasProps && $('#services').height() === 0) expandServices();

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
            var syncletsToRender = [];
            for (var i in data.uses) {
                for (var j = 0; j < synclets.available.length; j++) {
                    if (synclets.available[j].provider === data.uses[i]) {
                        if(synclets.available[j].authurl) {
                            providers.push(data.uses[i]);
                            if (typeof(synclets.installed[data.uses[i]]) != "undefined") {
                                syncletsToRender.push(synclets.available[j]);
                            } else {
                                syncletsToRender.unshift(synclets.available[j]);
                            }
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
            for (var i = 0; i < syncletsToRender.length; i++) {
                drawService(syncletsToRender[i]);
            }
        });
    });
}

function drawService(synclet) {
    var newService = $("#" + synclet.provider + "connect");
    if (newService.length == 0) {
        newService = $('.service.template').clone();
        newService.attr('id', synclet.provider + 'connect');
        $('#service-selector').append(newService);
    }
    newService.find('.provider-icon').attr('src', 'img/icons/' + synclet.provider + '.png').attr('title', synclet.info);
    newService.find('.provider-link').attr('href', synclet.authurl).data('provider', synclet.provider);
    newService.find('.provider-name').text(synclet.provider);
    newService.removeClass('template');
};

function hideViewers() {
    $("#viewers").animate({"left":"-320px"}, 300, function() {
        $("#viewers-title").hide();
        $("#viewers-list").hide();
        $("#appFrame")[0].contentWindow.focus();
        $("#viewers-slide-button").attr('src', 'img/slide-out.png');
    });
};

function openViewers() {
    $("#viewers-title").show();
    $("#viewers-list").show();
    $("#viewers").animate({"left":"0px"}, 300, function() {
        $("#viewers-slide-button").attr('src', 'img/slide-in.png');
    });
}

function drawViewer(viewer, isSelected, appType) {
    var newService = $('.viewer.template').clone();
    var viewerUrl = externalBase + '/Me/' + viewer.handle + '/';
    newService.find('.viewer-icon').attr('src', viewerUrl + 'img/viewer-icon.png').attr('onError', 'this.src=\'img/viewer-icon.png\'');
    newService.find('.viewer-link').attr('href', '#' + viewer.viewer);
    if(!isSelected) {
        newService.find('.viewer-link').click(function() {
            hideViewers();
            if(viewer.sync)
            {
                log("forced background syncing to github");
                $.get('/synclets/github/run?id=repos', function(){});
                showGritter('syncgithub');
                try {
                     _gaq.push(['_trackPageview', '/track/syncviewers']);
                } catch(err) {
                    console.error(err);
                }
                return;
            }
            if (viewer.handle === 'devdocs') {
                $("#appFrame")[0].contentWindow.location.replace("/Me/devdocs/");
                drawViewers();
            } else {
                setViewer(viewer.viewer, viewer.handle, function() {
                    renderApp();
                    drawViewers();
                });
            }
        });
    } else {
        newService.addClass('selected');
    }
    newService.find('.viewer-name').text(viewer.title);
    newService.find('.viewer-author').text(viewer.author !== ''?"by " + viewer.author:'');
    newService.find('.viewer-author-link').attr('href', "https://github.com/" + viewer.author);
    newService.removeClass('template');
    $('.' + appType + 'Views').append(newService);

    if(viewer.author == "") return;
}

function drawViewers() {
    log('drawViewers');
    $.getJSON('viewers', function(data) {
        $('.viewer:not(.template)').remove();
        var apps = ["links", "contacts", "photos"];
        for (var j = 0; j < 3; ++j) {
            var viewersToRender = data.available[apps[j]];
            for(var i in viewersToRender) {
                drawViewer(viewersToRender[i], data.selected[app] === viewersToRender[i].handle, apps[j]);
                if (viewersToRender[i].author !== 'Singly') {
                   try {
                       _gaq.push(['_trackPageview', '/track/installedviewers']);
                   } catch(err) {
                       console.error(err);
                   }

                }
            }
        }
        /*
        var addViewerView = {
            title: 'Create a Viewer',
            author: '',
            viewer: 'photos',
            handle: 'devdocs'
        };
        drawViewer(addViewerView, false);
        if(!installed || !installed.github) return;
        var addViewerView = {
            title: 'Sync your views from GitHub',
            author: '',
            viewer: 'photos',
            handle: 'useui',
            sync: true
        };
        drawViewer(addViewerView, false);
        */
    });
}

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

function renderApp(fragment) {
    if (timeout) clearTimeout(timeout);
    $('.selected').removeClass('selected');
    $("#" + app).addClass('selected');
    $.getJSON('viewers', function(data) {
        if (fragment !== undefined &&
            (fragment.split('-')[0] === 'view' ||
            fragment.split('-')[0] === 'search' ||
            fragment.split('-')[0] === 'new')) {
            if (app === 'photos') appId = 'photosv09';
            if (app === 'contacts') appId = 'contactsviewer';
            if (app === 'links') appId = 'linkalatte';
            data.selected[app] = appId;
        } else {
            if (!data.selected[app]) return;
            appId = data.selected[app];
        }
        var viewerUrl = externalBase + '/Me/' + appId + '/';
        drawServices();
        drawViewers();
        (function poll (data) {
            $.getJSON("/Me/" + app + "/state", function(state) {
                ready = state.count > 0;
                if (ready) {
                    // log('clearing timeout');
                    var needReload = false;
                    if (!fragment && viewerUrl == $("#appFrame")[0].contentWindow.location.toString()) needReload = true;
                    $("#appFrame")[0].contentWindow.location.replace(viewerUrl + (fragment?("?"+fragment+"#"+fragment):"")); // HACK WTF OMG IrAGEuBroSER!
                    if (needReload) {
                        $("#appFrame")[0].contentDocument.location.reload(true);
                    }
                    $("#appFrame")[0].contentWindow.focus();
                    clearTimeout(timeout);
                    if (manuallyClosed) closeServices();
                }
                else {
                    var currentLocation = $("#appFrame")[0].contentWindow.location;
                    var newLocation = viewerUrl + "notready.html";
                    if (currentLocation.toString() !== newLocation)
                        currentLocation.replace(newLocation);
                    clearTimeout(timeout);
                    timeout = setTimeout(function() {poll(data);}, 1000);
                    log(timeout);
                }
            });
        })(data);
    });
};

function expandServices()
{
  $('.services-box-container').addClass("active");

  // Hide child elements of the services container...
  $('#services #choose-services').hide();
  $('#services #service-selector').hide();

  $("#services").css({ height: "0px" }).show();

  // Push the viewers slider down...
  $("#viewers").animate({ top: "183px" }, { duration: 200 });

  // Push the main content area down...
  $("#iframeWrapper").animate({ top: "161px" }, { duration: 200 });

  // TODO The above should both be handled by resizing their container, not each individually...

  // Expand the Services area to size...
  $('#services').animate({ height: "96px" }, { duration: 200, complete: function() {
    $('#services #choose-services').fadeIn();
    $('#services #service-selector').fadeIn();
    resizeFrame();
  }});
  $('#appFrame').animate({ height: $(window).height() - 96 - $('.header').height() }, { duration: 200 });
}

function resizeFrame() {
    $('#appFrame').height($(window).height() - $('#services').height() - $('.header').height());
    $("#appFrame").width($(window).width());
}



function closeServices(duration)
{
  dur = duration == undefined ? 200 : duration;
  $('.services-box-container').removeClass("active");

  // Restore the main content area...
  $("#iframeWrapper").animate({
    top: "64px"
  }, {
      duration: dur, queue: false
  });

  // Restore the viewers slider...
  $("#viewers").animate({ top: "86px" }, { duration: dur });

  $('#services').animate({height: "0px"}, {duration: dur, queue: false, complete:function() {
      // $('.services-box-container').show();
      $('#services').hide();
      resizeFrame();
  }});

  $("#doMorePopup:visible").hide();

}


/*
 * GuidedSetup
 */
var GuidedSetup = (
    function () {
        var GuidedSetup = function () {
            var t = this;
            t.totalDone = 0;

            t.drawGuidedSetup = function() {
                var that = this;
                $("#firstRun").show();
                $("#firstRun").load("html/firstRun.html", function() {
                    drawServices();
                    $("#moreFirstOptions").click(function() {
                        $("#firstRun .lightbox").remove();
                        drawServices();
                        $("#services").css("z-index", 10001);
                        expandServices();
                        $("#needOnePopup").delay(200).fadeIn({duration:250});
                        return false;
                    });
                    $('.firstChoice').delegate('.provider-link', 'click', function() {
                        if ($(this).hasClass('disabled')) return false;
                        accountPopup($(this));
                        return false;
                    });
                    $("a.close").click(function() {
                       $("#doMorePopup").hide();
                    });
                });
            };

            t.serviceConnected = function() {
                t.totalDone++;
                if ($("#firstRun:visible").length > 0) {
                    $("#firstRun .lightbox").remove();
                    drawServices();
                    $("#firstRun").hide();
                    expandServices();
                    $("#doMorePopup").appendTo($("body")).show();
                } else {
                    // Subtract 1 for the template
                    if (t.totalDone >= ($("#services .service").length - 1)) {
                        $("#doMorePopup").remove();
                    } else {
                        $("#doMorePopup span:visible").hide().next().show();
                    }
                }
            }

            t.drawGuidedSetup();
        };

        return function () {
            return new GuidedSetup();
        };

    })();

function drawGuidedSetup() {
    if (guidedSetupActive) return;
    guidedSetupActive = true;
}

function setViewer(type, handle, callback) {
    $.post('setViewer', {type:type, handle:handle}, callback);
}
