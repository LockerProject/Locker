var fs = require('fs');
var filename = 'keychain.json';

var chain;
try {
    chain = JSON.parse(fs.readFileSync(filename));
} catch(err) {
    chain = {'objects':{}, 'perms':{}};
}

function write() {
    fs.writeFile(filename, JSON.stringify(chain));
}

exports.putObject = function(serviceType, object, meta) {
    var obj = {'object':object};
    if(meta)
        obj.meta = meta;
        
    if(!chain.objects.hasOwnProperty(serviceType)) {
        chain.objects[serviceType] = [obj];
    } else {
        chain.objects[serviceType].push(obj);
    }
    write();
}

exports.permissionServiceIDToObject = function(serviceID, serviceType, index) {
    if(!chain.objects.hasOwnProperty(serviceType)) {
        throw new Error('no objects of service type ' + serviceType);
    } else if(index < 0 || index >= chain.objects[serviceType].length) {
        throw new Error('' + index + ' not valid for service ID ' + serviceID);
    }
    
    var perms = chain.perms[serviceID];
    if(!perms) {
        chain.perms[serviceID] = {};
        perms = chain.perms[serviceID];
    }
    if(!perms.hasOwnProperty(serviceType)) {
        perms[serviceType] = [];
    }
    perms[serviceType][index] = true;
    write();
}

exports.getObjectsMetaOfServiceType = function(serviceType) {
    var arr = chain.objects[serviceType];
    if(!arr)
        return [];
    
    var ret = [];
    for(var i in arr)
        ret.push(arr[i]['meta']);
    return ret;
}

function isAllowed(serviceID, serviceType, index) {
    return index >= 0 && //valid index
           chain.perms.hasOwnProperty(serviceID) && //has any permissions at all
           index < chain.perms[serviceID][serviceType].length && //valid index
           chain.perms[serviceID][serviceType][index]; //has permission
}

exports.getObject = function(serviceID, serviceType, index) {
    if(!isAllowed(serviceID, serviceType, index))
        throw new Error('Permission Denied');
        
    if(chain.objects.hasOwnProperty(serviceType))
        return chain.objects[serviceType][index].object;
    else
        throw new Error('no objects of service type ' + serviceType);
}
