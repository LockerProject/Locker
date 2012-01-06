exports.sync = require('./lib').genericSync('profile', function(pi){
    return "people/~:(id,first-name,last-name,headline,location:(name,country:(code)),industry,current-share,connections,num-connections,summary,specialties,proposal-comments,associations,honors,interests,positions,publications,patents,languages,skills,certifications,educations,num-recommenders,recommendations-received,phone-numbers,im-accounts,twitter-accounts,date-of-birth,main-address,member-url-resources,picture-url,site-standard-profile-request:(url),api-standard-profile-request:(url),site-public-profile-request:(url),api-public-profile-request:(url),public-profile-url)";
},function(pi, js){
    return [js];
});