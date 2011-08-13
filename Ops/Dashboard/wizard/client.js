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
         * StatePoll
         */
        var StatePoll = (
            function () {
                var StatePoll = function (handle) {
                    var t = this;

                    t.handle = handle;
                    t.state = "";
                    t.installed = false;
                    t.uri = "/Me/"+t.handle+"/";
                    t.el = $("#"+t.handle+"Connect");

                    t.el.find("a").click( 
                        function (e) {
                            e.stopImmediatePropagation();
                            e.preventDefault();
                            console.log("clicked");
                            if (!t.installed) {
                                t.pending();
                                $.getJSON("install", {handle:handle},
                                          function(data, err, resp) {
                                              if(data && data.success) {
                                                  var svc = data.success;
                                                  t.installed = true;
                                                  window.open(t.uri);
                                              } else {
                                                  alert('error:' + JSON.string(data));
                                              }
                                          });
                            } else {
                                window.open(t.uri);
                            }

                        });

                    t.handleResponse = function(data, err, resp) {
                        t.ready = data.ready;
                        
                        if (data.ready > 0 && data.syncing > 0) {
                            t.pending();
                            // show counters
                            $("#wizard-collections").slideDown();
                            $("#wizard-actions").fadeIn();
                            $("#popup h2").html(_s[1].action).next().html(_s[1].desc);
                        }

                        t.timeout = setTimeout(t.query, 1000);
                    };

                    t.query = function() {
                        url = t.uri + "state";
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
                    return new StatePoll(name);
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
                             
                             // connectors
                             window.facebookStatePoll = new StatePoll("facebook");
                             window.twitterStatePoll = new StatePoll("twitter");
                             window.googleContactsStatePoll = new StatePoll("gcontacts");
                             window.githubStatePoll = new StatePoll("github");
                         });
    }
);				
