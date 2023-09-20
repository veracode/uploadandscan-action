const core = require('@actions/core');
const appConfig = require('../app-cofig.js');
const { 
  getResourceByAttribute,
  createResource,
}= require('../api/http-requests.js');

async function getPolicyByName (vid, vkey, policyName)  {
  const resource = {
    resourceUri: appConfig().policyUri,
    queryAttribute: 'name',
    queryValue: encodeURIComponent(policyName)
  };
  const response = await getResourceByAttribute(vid, vkey, resource);
  return response;
}

async function getVeracodePolicyByName(vid, vkey, policyName) {
  core.debug(`Module: policy-service, function: getVeracodePolicyByName. policyName: ${policyName}`);
  if (policyName !== '') {
    const responseData = await getPolicyByName(vid, vkey, policyName);
    if (responseData.page.total_elements !== 0) {
      for(let i = 0; i < responseData._embedded.policy_versions.length; i++) {
        if (responseData._embedded.policy_versions[i].name.toLowerCase()
              === policyName.toLowerCase()) {
          return {
            'policyGuid': responseData._embedded.policy_versions[i].guid,
          }
        }
      }
    }
  }
  core.debug(`No Veracode policy found for ${policyName}, using default policy`);
  return { 'policyGuid': '9ab6dc63-29cf-4457-a1d1-e2125277df0e' };
}

module.exports = {
  getVeracodePolicyByName
};