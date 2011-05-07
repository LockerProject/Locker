var fs = require('fs');
var crypto = require('crypto');
var filename = 'keychain.json';

var chain;
try {
    chain = JSON.parse(fs.readFileSync(filename));
} catch(err) {
    chain = {'authTokens':{}, 'descriptors':{}, 'permissions':{}};
}

function write() {
    fs.writeFile(filename, JSON.stringify(chain));
}

exports.putAuthToken = function(authToken, serviceType, descriptor) {
    var authTokenID = genID();
    chain.authTokens[authTokenID] = authToken;
    if(!chain.descriptors.hasOwnProperty(serviceType))
        chain.descriptors[serviceType] = {};
    chain.descriptors[serviceType][authTokenID] = descriptor;
    write();
    return authTokenID;
}

exports.grantPermission = function(authTokenID, serviceID) {
    if(!chain.authTokens.hasOwnProperty(authTokenID))
        throw new Error('Auth token ' + authTokenID + ' does not exist!');
    
    if(!chain.permissions.hasOwnProperty(authTokenID))
        chain.permissions[authTokenID] = {};
    
    if(!chain.permissions.hasOwnProperty(authTokenID))
        chain.permissions[authTokenID] = {};
    
    chain.permissions[authTokenID][serviceID] = true;
    write();
}

exports.getTokenDescriptors = function(serviceType) {
    if(!chain.descriptors.hasOwnProperty(serviceType))
        return {};
    
    return chain.descriptors[serviceType];
}

function isAllowed(authTokenID, serviceID) {
    return chain.permissions.hasOwnProperty(authTokenID) && //has any permissions at all
           chain.permissions[authTokenID][serviceID]; //has permission
}

exports.getAuthToken = function(authTokenID, serviceID) {
    if(!isAllowed(authTokenID, serviceID))
        throw new Error('Permission Denied');
        
    if(chain.authTokens.hasOwnProperty(authTokenID))
        return chain.authTokens[authTokenID];
    else
        throw new Error('Auth token ' + authTokenID + ' does not exist');
}

function genID() {
    var hash = crypto.createHash('md5');
    hash.update(Math.random()+'');
    return hash.digest('hex');
}
