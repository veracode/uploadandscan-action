const axios = require('axios');
const { calculateAuthorizationHeader } = require('./veracode-hmac.js');
const appConfig = require('../app-cofig.js');

async function getResourceByAttribute (vid, vkey, resource) {
  const resourceUri = resource.resourceUri;
  const queryAttribute = resource.queryAttribute;
  const queryValue = resource.queryValue;
  const urlQueryParams = queryAttribute !== '' ? `?${queryAttribute}=${queryValue}` : '';
  const headers = {
    'Authorization': calculateAuthorizationHeader(vid, vkey, appConfig().hostName, resourceUri, 
      urlQueryParams, 'GET')
  };

  const appUrl = `https://${appConfig().hostName}${resourceUri}${urlQueryParams}`;
  try {
    const response = await axios.get(appUrl, { headers });
    return response.data; // Access the response data
  } catch (error) {
    console.error(error);
  }
}

async function createResource(vid, vkey, resource) {
  const resourceUri = resource.resourceUri;
  const resourceData = resource.resourceData;
  const headers = {
    'Authorization': calculateAuthorizationHeader(vid, vkey, appConfig().hostName, resourceUri, 
      '', 'POST')
  };

  const appUrl = `https://${appConfig().hostName}${resourceUri}`;
  try {
    const response = await axios.post(appUrl, resourceData, { headers });
    return response.data; // Access the response data
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  getResourceByAttribute,
  createResource,
};