const axios = require('axios');
const { calculateAuthorizationHeader } = require('./veracode-hmac.js');
const appConfig = require('../app-cofig.js');
const core = require('@actions/core');

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

async function getResource (vid, vkey, resource) {
  const resourceUri = resource.resourceUri;
  const headers = {
    'Authorization': calculateAuthorizationHeader(vid, vkey, appConfig().hostName, resourceUri, 'GET')
  };

  const appUrl = `https://${appConfig().hostName}${resourceUri}`;
  core.info(appUrl);
  core.info(JSON.stringify(headers));
  try {
    const response = await axios.get(appUrl, { headers });
    core.info(JSON.stringify(response.data));
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
  getResource,
  createResource,
};