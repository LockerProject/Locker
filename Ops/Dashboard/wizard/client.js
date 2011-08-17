$(document).ready(
    function() {
        var _s = [{
                      action: "Click on the service you'd like to add first:",
                      desc: "You must install one service in order to use your locker."
                  },
                  {
                      action: "Your data is syncing in the background:",
                      desc: "Click on another service to make your Locker more awesome!"
                  },
                  {
                      action: "Wow! You're a social-web powerhouse!",
                      desc: "Click 'Next' to continue."                      
                  }
                 ];


        var CountPoll = (
            function () {
                var CountPoll = function (name) {
                    var t = this;
                    t.name = name;
                    t.lastCount = 0;
                    t.count = 0;
                    
                    t.handleResponse = function(data, err, resp) {
                        t.lastCount = t.count;
                        t.count = data.count;
                        if (t.count != t.lastCount) {
                            console.log("Updated count of "+t.name+": " + data.count);

                            $("#"+t.name+"Count").odoTicker(
                                {
	                            number: data.count ? data.count : 0, //Number to load
	                            speed: 1500, //speed in ms
	                            height: 28 	 //height of a single number in the CSS sprite
                                }
                            );
                        }
                        if (t.lastCount == 0 && t.count != 0) {
                            console.log("Not 0 anymore");
                            $("#wizard-collections").slideDown();
                            $("#wizard-actions").fadeIn();
                            $("#popup h2").html(_s[1].action).next().html(_s[1].desc);
                        }

                        t.timeout = setTimeout(t.query, 1000);
                    };

                    t.query = function() {
                        $.getJSON("/Me/"+t.name+"/state", {}, t.handleResponse);
                    };

                    t.halt = function() {
                        clearTimeout(t.timeout);
                    };
                    
                    // init
                    t.query();
                    $("#"+t.name+"Count").odoTicker(
                        {
	                    number: 0,   //Number to load
	                    speed: 1500, //speed in ms
	                    height: 28   //height of a single number in the CSS sprite
                        });
                    
                };
                
                return function (name) {
                    return new CountPoll(name);
                };

            })();
       
        /* 
         * SyncletPoll
         */
        var SyncletPoll = (
            function () {
                var SyncletPoll = function (handle) {
                    var t = this;
                    t.uri = "/synclets";

                    t.handleResponse = function(data, err, resp) {
                        console.log(data);
                        // if first time:
                        //   need to pull authurls from feed
                        //   assign authurls to buttons with popups 
                        // for app in instaled:
                        //   update state of app if 
                        
                        var wizardApps = ["facebook", "twitter", "gcontacts", "github"];
                        for (var app in data.available) {
                            app = data.available[app];

                            if (wizardApps.indexOf(app.provider) != -1 && typeof(app.authurl) != "undefined") {
                                console.log(app.provider);
                                // update app button with the correct link
                                
                                // get el
                                var $el = $("#"+ app.provider + "Connect a:first");
                                
                                // change link
                                console.log("Change link for " + app.provider + " to " + app.authurl);
                                $el.attr("href", app.authurl);
                                $el.attr("target", "_blank");
                                console.log(app.authurl);
                            }
                        }
                        
                        for (app in data.installed) {
                            app = data.installed[app];

                            if (wizardApps.indexOf(app.name) != -1) {
                                console.log(app.provider);                                
                                // update app button with "pending" gfx
                            }
                        }
                        
                        //t.timeout = setTimeout(t.query, 1000);
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
                        clearTimeout(t.timeout);
                    };
                    
                    t.pending = function() {
                        console.log(t.handle + " pending");
                        if (t.state != "pending") {
                            t.state = "pending";
                            t.el.find('a').addClass("pending disabled");
                            t.stateSpinner = spinner(t.el.children(".spinner").get(0), 15, 20, 20, 4, "#aaa");
                        }
                    };
                    
                    // init
                    t.query();
                };
                
                return function (name) {
                    return new SyncletPoll(name);
                };

            })();
            
        function spinner(container, R1, R2, count, stroke_width, colour) {
            var sectorsCount = count || 12,
            color = colour || "#fff",
            width = stroke_width || 15,
            r1 = Math.min(R1, R2) || 35,
            r2 = Math.max(R1, R2) || 60,
            cx = r2 + width,
            cy = r2 + width,
            r = Raphael(container, r2 * 2 + width * 2, r2 * 2 + width * 2),
            
            sectors = [],
            opacity = [],
            beta = 2 * Math.PI / sectorsCount,
            
            pathParams = {stroke: color, "stroke-width": width, "stroke-linecap": "round"};
            Raphael.getColor.reset();
            for (var i = 0; i < sectorsCount; i++) {
                var alpha = beta * i - Math.PI / 2,
                cos = Math.cos(alpha),
                sin = Math.sin(alpha);
                opacity[i] = 1 / sectorsCount * i;
                sectors[i] = r.path([["M", cx + r1 * cos, cy + r1 * sin], ["L", cx + r2 * cos, cy + r2 * sin]]).attr(pathParams);
                if (color == "rainbow") {
                    sectors[i].attr("stroke", Raphael.getColor());
                }
            }
            var tick;
            (function ticker() {
                 opacity.unshift(opacity.pop());
                 for (var i = 0; i < sectorsCount; i++) {
                     sectors[i].attr("opacity", opacity[i]);
                 }
                 r.safari();
                 tick = setTimeout(ticker, 1000 / sectorsCount);
             })();
            return function () {
                clearTimeout(tick);
                r.remove();
            };
        }
        
        $('#popup').live('pagecreate',function(event){
                             // collections
                             var photoCountPoll = new CountPoll("photos");
                             var linkCountPoll = new CountPoll("links");
                             var contactCountPoll = new CountPoll("contacts");
                             
                             // synclets
                             window.syncletPoll = new SyncletPoll();
                         });
    }
);				

function accountPopup (url) {
    console.log("URL " + url);
    var popup = window.open(url, "account",
                            "width=620,height=400,status=no,scrollbars=no,resizable=no");
    popup.focus();
}
