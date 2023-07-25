const appConfig = require('../app-cofig.js');
const { 
  getResourceByAttribute,
  createResource,
}= require('../api/http-requests.js');
const fs = require('fs/promises');
const artifact = require('@actions/artifact');
const { getVeracodePolicyByName } = require('./policy-service.js');

async function getApplicationByName (vid, vkey, applicationName)  {
  const resource = {
    resourceUri: appConfig().applicationUri,
    queryAttribute: 'name',
    queryValue: encodeURIComponent(applicationName)
  };
  const response = await getResourceByAttribute(vid, vkey, resource);
  return response;
}

async function getVeracodeApplicationForPolicyScan (vid, vkey, applicationName, policyName, createprofile)  {
  const responseData = await getApplicationByName(vid, vkey, applicationName);
  if (responseData.page.total_elements === 0) {
    if (createprofile.toLowerCase() !== 'true')
      return { 'appId': -1, 'appGuid': -1, 'oid': -1 };
    
    const veracodePolicy = await getVeracodePolicyByName(vid, vkey, policyName);
    // create a new Veracode application
    const resource = {
      resourceUri: appConfig().applicationUri,
      resourceData: {
        profile: {
          business_criticality: "HIGH",
          name: applicationName,
          policies: [
            {
              guid: veracodePolicy.policyGuid
            }
          ]
        }
      }
    };
    const response = await createResource(vid, vkey, resource);
    const appProfile = response.app_profile_url;
    return {
      'appId': response.id,
      'appGuid': response.guid,
      'oid': appProfile.split(':')[1]
    };
  } else {
    for(let i = 0; i < responseData._embedded.applications.length; i++) {
      if (responseData._embedded.applications[i].profile.name.toLowerCase() 
            === applicationName.toLowerCase()) {
        return {
          'appId': responseData._embedded.applications[i].id,
          'appGuid': responseData._embedded.applications[i].guid,
          'oid': responseData._embedded.applications[i].oid,
        }
      }
    }
  }
}

async function getVeracodeApplicationFindings(vid, vkey, veracodeApp, buildId) {
  const resource = {
    resourceUri: `${appConfig().findingsUri}/${veracodeApp.appGuid}/findings`,
    queryAttribute: 'violates_policy',
    queryValue: 'True'
  };
  const response = await getResourceByAttribute(vid, vkey, resource);
  const resultsUrlBase = 'https://analysiscenter.veracode.com/auth/index.jsp#ViewReportsResultSummary';
  const resultsUrl = `${resultsUrlBase}:${veracodeApp.oid}:${veracodeApp.appId}:${buildId}`;
  // save response to policy_flaws.json
  // save resultsUrl to results_url.txt
  try {
    const jsonData = JSON.stringify(response, null, 2);
    await fs.writeFile('policy_flaws.json', jsonData);
    await fs.writeFile('results_url.txt', resultsUrl);
  } catch (err) {
    console.log(err);
  }
  

  const artifactClient = artifact.create()
  const artifactName = 'policy-flaws';
  const files = [
    'policy_flaws.json',
    'results_url.txt',
  ];
  const rootDirectory = process.cwd()
  const options = {
      continueOnError: true
  }
  await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options)
}

module.exports = {
  getVeracodeApplicationForPolicyScan,
  getVeracodeApplicationFindings
}