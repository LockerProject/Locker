var _gaq = _gaq || [];

if (document.location.hostname === 'singly.com') {
  _gaq.push(['_setAccount', 'UA-22812443-1']);
  _gaq.push(['_trackPageview']);
} else {
  _gaq.push(['_setAccount', 'UA-22812443-3']);
}

(function(d, t) {
 var g = d.createElement(t),
     s = d.getElementsByTagName(t)[0];
 g.async = true;
 g.src = '//www.google-analytics.com/ga.js';
 s.parentNode.insertBefore(g, s);
})(document, 'script');
