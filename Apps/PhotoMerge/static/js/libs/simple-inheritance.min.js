/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */(function(){var d=!1,g=/xyz/.test(function(){})?/\b_super\b/:/.*/;this.SimpleClass=function(){};SimpleClass.extend=function(b){function c(){!d&&this.init&&this.init.apply(this,arguments)}var e=this.prototype;d=!0;var f=new this;d=!1;for(var a in b)f[a]=typeof b[a]=="function"&&typeof e[a]=="function"&&g.test(b[a])?function(a,b){return function(){var c=this._super;this._super=e[a];var d=b.apply(this,arguments);this._super=c;return d}}(a,b[a]):b[a];c.prototype=f;c.constructor=c;c.extend=arguments.callee;
return c}})();