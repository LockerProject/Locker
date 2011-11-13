module.exports = function Equals(obj1, obj2) {
    if (typeof(obj2) === 'undefined' || obj2 === null) {
        return false;
    }

    for (var p in obj1) {
        if (!obj2.hasOwnProperty(p) || (obj2[p] === undefined && obj2[p] !== obj1[p])) {
            return false;
        }
    }

    for (var p in obj1) {
        if (obj1[p]) {
            switch(typeof(obj1[p])) {
                case 'object':
                    if (!Equals(obj1[p], obj2[p])) {
                        return false;
                    }
                    break;
                default:
                    if (obj1[p] !== obj2[p]) {
                        return false;
                    }
            }
        } else {
            if (obj2[p]) {
                return false;
            }
        }
    }

    for (var p in obj2) {
        if (!obj1.hasOwnProperty(p) || (obj1[p] === undefined && obj1[p] !== obj2[p])) {
            return false;
        } else {
            if (obj2[p] !== null && typeof obj2[p] === 'object') {
                if (!Equals(obj2[p], obj1[p])){
                    return false;
                }
            }
        }
    }

    return true;
}
