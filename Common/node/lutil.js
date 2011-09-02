/**
 * Adopted from jquery's extend method. Under the terms of MIT License.
 *
 * http://code.jquery.com/jquery-1.4.2.js
 *
 * Modified by Brian White to use Array.isArray instead of the custom isArray method
 */
exports.extend = function() {
  // copy reference to target object
  var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;

  // Handle a deep copy situation
  if (typeof target === "boolean") {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== "object" && typeof target !== 'function')
    target = {};

  var isPlainObject = function(obj) {
    // Must be an Object.
    // Because of IE, we also have to check the presence of the constructor property.
    // Make sure that DOM nodes and window objects don't pass through, as well
    if (!obj || toString.call(obj) !== "[object Object]" || obj.nodeType || obj.setInterval)
      return false;
    
    var has_own_constructor = hasOwnProperty.call(obj, "constructor");
    var has_is_property_of_method = hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf");
    // Not own constructor property must be Object
    if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
      return false;
    
    // Own properties are enumerated firstly, so to speed up,
    // if last one is own, then all properties are own.

    var last_key;
    for (var key in obj)
      last_key = key;
    
    return typeof last_key === "undefined" || hasOwnProperty.call(obj, last_key);
  };


  for (; i < length; i++) {
    // Only deal with non-null/undefined values
    if ((options = arguments[i]) !== null) {
      // Extend the base object
      for (name in options) {
        src = target[name];
        copy = options[name];

        // Prevent never-ending loop
        if (target === copy)
            continue;

        // Recurse if we're merging object literal values or arrays
        if (deep && copy && (isPlainObject(copy) || Array.isArray(copy))) {
          var clone = src && (isPlainObject(src) || Array.isArray(src)) ? src : Array.isArray(copy) ? [] : {};

          // Never move original objects, clone them
          target[name] = exports.extend(deep, clone, copy);

        // Don't bring in undefined values
        } else if (typeof copy !== "undefined")
          target[name] = copy;
      }
    }
  }

  // Return the modified object
  return target;
};

// Found on http://bonsaiden.github.com/JavaScript-Garden/#types.typeof
exports.is = function(type, obj) {
    var clas = Object.prototype.toString.call(obj).slice(8, -1);
    return obj !== undefined && obj !== null && clas === type;
};

exports.addAll = function(thisArray, anotherArray) {
    if(!(thisArray && anotherArray && anotherArray.length))
        return;
    for(var i = 0; i < anotherArray.length; i++)
        thisArray.push(anotherArray[i]);
};

exports.getPropertyInObject = function(jsonObject, propertyName, callback) {

    var foundValues = [];
    
    function recurseObject(jsonObject, propertyName) {
        if (exports.is("Object", jsonObject)) {
            for (var m in jsonObject) {
                if (jsonObject.hasOwnProperty(m)) {
                    if (m === propertyName) {
                        foundValues.push(jsonObject[m]);
                    }
                    else if (exports.is("Object", jsonObject[m])) {
                        recurseObject(jsonObject[m], propertyName);
                    }
                    else if (exports.is("Array", jsonObject[m])) {
                        for (var n=0; n<jsonObject[m].length; n++) {
                            recurseObject(jsonObject[m][n], propertyName);
                        }
                    }
                }
            }
        }
    }
    recurseObject(jsonObject, propertyName);
    callback(foundValues);
};

exports.trim = function(stringToTrim) {
	return stringToTrim.replace(/^\s+|\s+$/g,"");
}
exports.ltrim = function(stringToTrim) {
	return stringToTrim.replace(/^\s+/,"");
}
exports.rtrim = function(stringToTrim) {
	return stringToTrim.replace(/\s+$/,"");
}
