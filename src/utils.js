const appConfig = require('./app-cofig')

function getHostAndCredentials(vid, vkey) {
    let host = appConfig().us; // Default to the US host
  
    if (vid.startsWith('vera01ei-')) {
      host = appConfig().eu; // Switch to the EU host
      vid = vid.split('-')[1] || ''; // Extract the part after '-'
      vkey = vkey.split('-')[1] || ''; // Extract the part after '-'
    }
  
    return { host, vid, vkey };
  }
  
  module.exports = { getHostAndCredentials }