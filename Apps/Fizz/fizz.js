/*
 * (C) Copyright 2011 Bloom Studio Inc. All Rights Reserved.
 *
 * Hi! Thanks for viewing source :) 
 *
 * Please email info@bloom.io if you're interested in using Fizz.
 *
 */
var Fizz = function() {

    var p5; // set in sketchProc
    var id; // set in init()
    
    var bubbles = [];
    var allBubbles = [];
    
    var active = false;
    var highlight = '';
    var firstCreationTime = 0;
    var lastCreationTime = 0;

    var prevMouseParent = null;
    var prevMouseChild = null;

    var selectedParent = null;
    var selectedChild = null;
    var tx = 0;
    var ty = 0;
    var sc = 1;

    window.sc = function() { if (arguments.length == 1) { sc = arguments[0] } else { return sc } };
    
    function Bubble(id, text) {
        this.id = id;
        this.text = text;
        this.x = this.y = this.vx = this.vy = 0;
        this.children = []; // sub-bubbles
        this.creationTime = p5.millis();
        this.lock = false;
        this.c = p5.color(0);
    }
    
    function RadiusBounds(r) {
        return function(p) {
            var currentR = p5.mag(p.x,p.y);
            var maxR = r-p.r;
            if (currentR > maxR) {
                var newR = currentR + (maxR-currentR)/10.0;
                var a = p5.atan2(p.y,p.x);
                var scaleFactor = 0.5;
                p.vx += ((newR * p5.cos(a))-p.x)/scaleFactor;
                p.vy += ((newR * p5.sin(a))-p.y)/scaleFactor;
            }
        }
    } 
    
    function RectBounds(x, y, w, h) {
        return function(p) {
            if (p.x < x+p.r) {
                p.vx += (x+p.r-p.x)/20.0;
            }
            else if (p.x > x+w-p.r) {
                p.vx -= (p.x-(x+w-p.r))/20.0;
            }
            if (p.y < y+p.r) {
                p.vy += (y+p.r-p.y)/20.0;
            }
            else if (p.y > y+h-p.r) {
                p.vy -= (p.y-(y+h-p.r))/20.0;
            }
        }
    }  
    
    function addBubble(data, parentId) {
        if (!parentId) {
            var p = new Bubble(data.id, data.text);
            p.r = data.size;
            p.x = p5.random(p.r, p5.width-p.r*2);
            p.y = p5.random(30+p.r, p5.height-50-p.r*2);
            p.c = data.color || p5.color(textHue(data.text),50,50);
            bubbles.push(p);
            allBubbles.push(p);
        }
        else {
            var parent = getBubble(parentId);
            if (parent == null) {
                return false;
            }
            var bubble = new Bubble(data.id, data.text);
            allBubbles.push(bubble);
            if (bubble.time > 0) {
                bubble.creationTime = bubble.time;
            }
            if (firstCreationTime == 0) {
                firstCreationTime = bubble.creationTime;
                lastCreationTime = bubble.creationTime;
            }
            else {
                firstCreationTime = p5.min(firstCreationTime, bubble.creationTime);
                lastCreationTime = p5.max(lastCreationTime, bubble.creationTime);
            }
            bubble.r = data.size;
            var r = p5.random(parent.r - bubble.r);
            var a = p5.random(p5.TWO_PI);
            bubble.x = r * p5.cos(a);
            bubble.y = r * p5.sin(a);
            bubble.c = data.color || p5.color(p5.constrain(p5.hue(parent.c)+p5.random(-20,20),0,255), 100, 255);
            parent.children.push(bubble);
        }
    }
        
    function getBubble(id) {
        for (var i = 0; i < bubbles.length; i++) {
            var bubble = bubbles[i];
            if (bubble.id == id) {
                return bubble;
            }
        }
        // TODO: search children
        return null;
    }
    
    function textHue(name) {
        var total = 0;
        for (var i = 0; i < name.length; i++) {
            total += name.charCodeAt(i);
        }
        return total % 255;
    }
        
    function circlePack(particles, bounds, attractX, attractY) {
        var len = particles.length;
        for (var i = 0; i < len-1; i++) {
            var p1 = particles[i];
            for (var j = i+1; j < len; j++) {
                var p2 = particles[j];
                var d = p5.dist(p1.x,p1.y,p2.x,p2.y);
                var minD = p1.r+p2.r;
                var tightness = 1.05; // 0.95 gives tight packing, 1.1 gives a border                
                if (d < minD * tightness) {
                    var f = (1.0 - p5.sqrt(d/(minD*tightness)));
                    //var f = 1.0/50.0;
                    var dx = (p2.x-p1.x)*f;
                    var dy = (p2.y-p1.y)*f;
                    p1.vx -= dx;
                    p1.vy -= dy;
                    p2.vx += dx;
                    p2.vy += dy;
                }
            }
        }
        for (var i = 0; i < len; i++) {
            var p = particles[i];
            bounds(p);
            if (p.lock) { 
                p.vx = p.vy = 0;
                continue;
            }        
            // move to attraction point
            p.vx += (attractX - p.x)/1000.0;
            p.vy += (attractY - p.y)/1000.0;
            // apply velocity
            p.x += p5.constrain(p.vx/(1.0+p.children.length), -10.0, 10.0);
            p.y += p5.constrain(p.vy/(1.0+p.children.length), -10.0, 10.0);
            // drag for next frame
            p.vx *= 0.95;
            p.vy *= 0.95;
        }
        // now apply to children
        for (var i = 0; i < len; i++) {
            var p = particles[i];
            circlePack(p.children, RadiusBounds(p.r), 0, 0);
        }    
    }        
    
    function applyWorld() {
        p5.translate(p5.width/2,p5.height/2);
        p5.scale(sc);
        p5.translate(-p5.width/2,-p5.height/2);
        p5.translate(tx,ty);    
    }
    
    function worldX(x) {
        x -= p5.width/2.0;
        x /= sc;
        x += p5.width/2.0;
        x -= tx;
        return x;
    }

    function worldY(y) {
        y -= p5.height/2.0;
        y /= sc;
        y += p5.height/2.0;
        y -= ty;
        return y;
    }
    
    function sketchProc(processing) {

        p5 = processing;
                    
        var startMillis;
        var font, bfont;
        
        p5.setup = function() {
        
            // TODO: find a better way to handle the initial size (what if this is skipped? will it use the canvas size?)
            var widget = document.getElementById('widget');
            p5.size(widget.offsetWidth, widget.offsetHeight);
            
            p5.frameRate(30);
            p5.background(0xff505964);
            
            font = p5.loadFont("Helvetica");
            bfont = p5.loadFont("Helvetica-Bold");
            
            p5.colorMode(p5.HSB);
            
            bubbles = [];
            allBubbles = [];
            
            selectedParent = null;
            selectedChild = null;
            tx = 0;
            ty = 0;
            sc = 1;            
            
            firstCreationTime = 0;
            lastCreationTime = 0;
            
            startMillis = p5.millis();
        }
                
        p5.draw = function() {
            p5.colorMode(p5.RGB);
            p5.background(0x50,0x59,0x64);
            p5.colorMode(p5.HSB);
            if (!active) {
                if (p5.random(1.0) < 0.1 && bubbles.length < 50) {
                    var parent = { id: bubbles.length, text: "Example User #" + bubbles.length, size: p5.random(6.0, 10.0) };
                    addBubble(parent);
                    var numPosts = p5.floor(p5.random(2,5));
                    for (var i = 0; i < numPosts; i++) {
                        var bubble = { id: bubbles.length, text: "(example bubble)", size: p5.random(6.0, 10.0) }
                        addBubble(bubble, parent.id);
                    }
                }
                if (p5.random(1.0) < 0.1 && allBubbles.length < 250) {
                    var bubble = { id: allBubbles.length, text: "(example bubble)", size: p5.random(6.0, 10.0) }
                    var parentId = p5.floor(p5.random(bubbles.length)).toString();
                    addBubble(bubble, parentId);
                }
            }
            /* if (selectedParent) {
                var tSc = p5.min(p5.width,p5.height) / (3.0*selectedParent.r);
                var tTx = p5.width/2-selectedParent.x;
                var tTy = p5.height/2-selectedParent.y;
                if (p5.dist(tTx,tTy,tx,ty) > 5.0) {
                    tx += (tTx-tx) / 3.0;
                    ty += (tTy-ty) / 3.0;                
                }
                else if (sc < tSc) {
                    tx += (tTx-tx) / 3.0;
                    ty += (tTy-ty) / 3.0;                
                    sc *= 1.1;
                    if (sc > tSc) sc = tSc;
                }
                else if (sc > tSc) {
                    tx += (tTx-tx) / 3.0;
                    ty += (tTy-ty) / 3.0;                
                    sc /= 1.1;
                    if (sc < tSc) sc = tSc;
                }
            }
            else {
                if (sc > 1.0) {
                    sc /= 1.2;
                    if (sc < 1.0) sc = 1.0;
                }
                else {
                    tx += (0-tx) / 3.0;
                    ty += (0-ty) / 3.0;              
                }
            } */
            p5.pushMatrix();
            applyWorld();
            var mouseParent = null;
            var mouseChild = null;
            p5.noStroke();
            for (var i = 0; i < bubbles.length; i++) {
                var parent = bubbles[i];
                if (mouseParent == null && p5.dist(parent.x,parent.y,worldX(p5.mouseX),worldY(p5.mouseY)) < parent.r) {
                    mouseParent = parent;
                    mouseParent.lock = true;
                }
                else {
                    parent.lock = false;
                }
                if (active) {
                    p5.noStroke();
                    if (parent.lock) {
                        p5.fill(parent.c);
                        p5.ellipse(parent.x,parent.y,parent.r*2,parent.r*2);
                    }
                    p5.fill(parent.c,150);
                }
                else {
                    p5.noFill();
                    p5.stroke(255);
                }
                if (highlight.length > 1 && highlight.charAt(0) == '@' && parent.text.toLowerCase().indexOf(highlight.toLowerCase().slice(1)) >= 0) {
                    p5.strokeWeight(2.0/sc);
                    p5.stroke(40,255,255);
                }
                else {
                    p5.strokeWeight(1.0/sc);
                }                
                p5.ellipse(parent.x,parent.y,parent.r*2,parent.r*2);
                var maxR = 0;
                for (var j = 0; j < parent.children.length; j++) {
                    var bubble = parent.children[j];
                    if (mouseParent == parent && mouseChild == null && p5.dist(parent.x+bubble.x,parent.y+bubble.y,worldX(p5.mouseX),worldY(p5.mouseY)) < bubble.r) {
                        mouseChild = bubble;
                        mouseChild.lock = true;
                    }
                    else {
                        bubble.lock = false;
                    }            
                    if (active) {
                        if (selectedChild == bubble) {
                            p5.fill(255);
                        }                    
                        else if(bubble.lock) {
                            p5.fill(p5.hue(bubble.c),p5.max(0,p5.saturation(bubble.c)-40),p5.min(255,p5.brightness(bubble.c)+40));
                        }
                        else {
                            var ageMult = (bubble.creationTime - firstCreationTime) / (lastCreationTime - firstCreationTime);
                            ageMult = 0.45 + 0.55 * ageMult;
                            p5.fill(p5.hue(bubble.c), p5.saturation(bubble.c), p5.brightness(bubble.c) * ageMult);
                        }
                        p5.noStroke();
                    }
                    else {
                        p5.noFill();
                        p5.stroke(255);
                    }
                    if (highlight.length > 0 && bubble.text && bubble.text.toLowerCase().indexOf(highlight.toLowerCase()) >= 0) {
                        p5.strokeWeight(2.0);
                        p5.stroke(40,255,255);
                    }
                    else {
                        p5.strokeWeight(1.0/sc);
                    }                    
                    p5.ellipse(parent.x+bubble.x,parent.y+bubble.y,bubble.r*2,bubble.r*2);
                    maxR = p5.max(maxR, p5.mag(bubble.x,bubble.y)+bubble.r);
                }
                if (maxR) {
                    if (parent.children.length == 1) {
                        maxR += 2;
                    }
                    var tightness = 1.0; // 0.95 gives tight packing, 1.1 gives a border
                    parent.r += ((maxR*tightness)-parent.r) / 5.0;
                }
            }
            circlePack(bubbles, RectBounds(0,0,p5.width,p5.height), p5.width/2, p5.height/2);
        
            if (active && jQuery) {
                if (mouseParent != prevMouseParent && prevMouseParent) {
                    $('#fizz').trigger('bubbleHoverOut', [ prevMouseParent.id ]);
                }
                if ((mouseParent != prevMouseParent || mouseChild != prevMouseChild) && mouseParent) {
                    var args = [ mouseParent.id, mouseChild ? mouseChild.id : null, p5.mouseX, p5.mouseY ];
                    $('#fizz').trigger('bubbleHoverOver', args);
                }
            }
            
            prevMouseParent = mouseParent;
            prevMouseChild = mouseChild;

            if (prevMouseParent) {
		p5.cursor(p5.HAND);
            }
            else {
		p5.cursor(p5.ARROW);
            }

            p5.popMatrix();
        }
        p5.mousePressed = p5.mouseDragged = function() {
            if (prevMouseParent) selectedParent = prevMouseParent;
            else selectedParent = null;
            if (prevMouseChild) selectedChild = prevMouseChild;
            else selectedChild = null;
            if (active && jQuery) {
                if (prevMouseParent) {
                    var args = [ prevMouseParent.id, prevMouseChild ? prevMouseChild.id : null, p5.mouseX, p5.mouseY ];
                    $('#fizz').trigger('bubbleClick', args);
                }
                else {
                    var args = [ null, null, p5.mouseX, p5.mouseY ];
                    $('#fizz').trigger('bubbleClick', args);
                }
            }
        }
    }

    
    function init(canvasId) {
        id = canvasId;
        var canvas = document.getElementById(id);
        var p5 = new Processing(canvas, sketchProc);
        var prevSize = { w: canvas.width, h: canvas.height };
        if (window.addEventListener) {
            window.addEventListener('resize', function() {
                var widget = canvas.parentNode;
                if (widget && prevSize.w != widget.offsetWidth || prevSize.h != widget.offsetHeight) {
                    p5.size(widget.offsetWidth, widget.offsetHeight);
                    p5.draw();
                    prevSize = { w: widget.offsetWidth, h: widget.offsetHeight };
                }
            }, false);
        }
    }
    
    return {
        init: init,
        addBubble: addBubble,
        getBubble: getBubble,
        active: function(b) { if (arguments.length > 0) { active = b; p5.setup(); } else { return active; } },
        highlight: function(s) { if (arguments.length > 0) { highlight = s; } else { return highlight; } },
        p5: function() { return p5; }
    }

}();
