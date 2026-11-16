const core = require('@actions/core');
const appConfig = require('../app-cofig.js');
const { 
  getResourceByAttribute,
  getResource,
  createResource,
}= require('../api/http-requests.js');
const fs = require('fs/promises');
const { getVeracodePolicyByName } = require('./policy-service.js');
const { getVeracodeTeamsByName } = require('./teams-service.js');
const { runCommand } = require('../api/java-wrapper.js');
const xml2js = require('xml2js');

async function getApplicationByName(vid, vkey, applicationName,isDebug) {
  core.debug(`Module: application-service, function: getApplicationByName. Application: ${applicationName}`);
  const resource = {
    resourceUri: appConfig().applicationUri,
    queryAttribute: 'name',
    queryValue: encodeURIComponent(applicationName)
  };
  core.debug(resource);
  const response = await getResourceByAttribute(vid, vkey, resource,isDebug);
  return response;
}

async function getVeracodeSandboxIDFromProfile(vid, vkey, appguid, debug) {
  if (debug)
    core.debug(`Module: application-service, function: getSandboxIDfromProfile. Application: ${appguid}`);
  const resource = {
    resourceUri: appConfig().applicationUri+"/"+appguid+"/sandboxes"
  };
  const response = await getResource(vid, vkey, resource);
  if (debug)
    core.debug(response);
  return response;
}

async function createSandboxRequest(vid, vkey, appguid, sandboxname, debug) {
  if (debug)
    core.debug(`Module: application-service, function: createSandbox. Application: ${appguid}`);
  const resource = {
    resourceUri: appConfig().applicationUri+"/"+appguid+"/sandboxes",
    resourceData: {
        name: sandboxname
    }
  };
  const response = await createResource(vid, vkey, resource);
  if (debug)
    core.debug(response);
  return response;
}

function profileExists(responseData, applicationName) {
  core.debug(`Module: application-service, function: profileExists. Application: ${applicationName}`);

  // Validate response data structure
  if (responseData == null || responseData.page == null ) {
    core.warning("Invalid response data when searching for application profile");
    try {
      core.info(JSON.stringify(responseData,null,2));
    } catch (stringifyError) {
      core.warning("Failed to stringify the response data");
      core.info(responseData);
    }
    return { exists: false, veracodeApp: null };
  }

  // Handle missing total_elements field
  if (typeof responseData.page.total_elements !== 'number') {
    core.warning(`Invalid 'total_elements' field in response. Expected number, got: ${typeof responseData.page.total_elements}`);
    return { exists: false, veracodeApp: null };
  }

  if (responseData.page.total_elements === 0) {
    core.debug(`No Veracode application profile found for ${applicationName}`);
    return { exists: false, veracodeApp: null };
  }
  else {
    // Validate _embedded.applications exists
    if (!responseData._embedded || !Array.isArray(responseData._embedded.applications)) {
      core.warning(`Invalid or missing '_embedded.applications' array in response`);
      return { exists: false, veracodeApp: null };
    }

    for(let i = 0; i < responseData._embedded.applications.length; i++) {
      const app = responseData._embedded.applications[i];

      // Validate required fields in application object
      if (!app.profile || !app.profile.name) {
        core.debug(`Skipping application at index ${i}: missing profile or profile.name`);
        continue;
      }

      if (!app.id || !app.guid) {
        core.debug(`Skipping application ${app.profile.name}: missing id or guid`);
        continue;
      }

      if (app.profile.name.toLowerCase() === applicationName.toLowerCase()) {
        return { exists: true, veracodeApp: {
          'appId': app.id,
          'appGuid': app.guid,
          'oid': app.oid || app.guid, // Use guid as fallback if oid is missing
        } };
      }
    }
    core.debug(`No Veracode application profile with exact the profile name: ${applicationName}`);
    return { exists: false, veracodeApp: null };
  }
}

async function getVeracodeApplicationForPolicyScan(vid, vkey, applicationName, policyName, teams, createprofile, gitRepositoryUrl, debug) {
  const responseData = await getApplicationByName(vid, vkey, applicationName);
  if (debug) {
    core.debug(`Module: application-service, function: getVeracodeApplicationForPolicyScan. Application: ${applicationName}`);
    core.debug(`Check if ${applicationName} is found via Application API`);
    core.debug(responseData);
  }
  const profile = profileExists(responseData, applicationName);
  if (debug)
    core.debug(`Check if ${applicationName} has a Veracode application profile`);
  // core.debug(profile);
  if (!profile.exists) {
    if (createprofile.toLowerCase() !== 'true')
      return { 'appId': -1, 'appGuid': -1, 'oid': -1 };
    
    const veracodePolicy = await getVeracodePolicyByName(vid, vkey, policyName);
    if (debug)
      core.debug(`Veracode Policy: ${veracodePolicy}`)
    const veracodeTeams = await getVeracodeTeamsByName(vid, vkey, teams);
    if (debug)
      core.debug(`Veracode Teams: ${veracodeTeams}`);
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
          ], 
          teams: veracodeTeams,
          git_repo_url: gitRepositoryUrl
        }
      }
    };
    if (debug)
      core.debug(`Create Veracode application profile: ${JSON.stringify(resource)}`);
    const response = await createResource(vid, vkey, resource);
    if (debug)
      core.debug(`Veracode application profile created: ${JSON.stringify(response)}`);

    // Validate response object
    if (!response || typeof response !== 'object') {
      throw new Error(`Invalid API response when creating application profile. Expected object, got: ${typeof response}. Response: ${JSON.stringify(response)}`);
    }

    // Extract and validate required fields
    if (!response.id) {
      core.warning(`Missing required field 'id' in API response. Response: ${JSON.stringify(response)}`);
    }
    if (!response.guid) {
      throw new Error(`Missing required field 'guid' in API response. Cannot proceed without guid. Response: ${JSON.stringify(response)}`);
    }

    // Extract OID from app_profile_url or use guid as fallback
    const appProfile = response.app_profile_url;
    let oid;

    if (appProfile && typeof appProfile === 'string') {
      const parts = appProfile.split(':');
      if (parts.length > 1) {
        oid = parts[1];
        if (debug)
          core.debug(`Extracted OID from app_profile_url: ${oid}`);
      } else {
        core.warning(`app_profile_url format unexpected (expected 'key:value' format). Could not extract OID. Using guid as fallback. app_profile_url: ${appProfile}`);
        oid = response.guid;
      }
    } else {
      core.warning(`app_profile_url not found or not a string in API response. Using guid as fallback. Expected app_profile_url to be a string, got: ${typeof appProfile}`);
      oid = response.guid;
    }

    const appId = response.id || response.guid; // Fallback to guid if id is missing

    if (debug) {
      core.debug(`Application creation response validated. appId: ${appId}, appGuid: ${response.guid}, oid: ${oid}`);
    }

    return {
      'appId': appId,
      'appGuid': response.guid,
      'oid': oid
    };
  } else return profile.veracodeApp;
}

async function getVeracodeApplicationScanStatus(vid, vkey, veracodeApp, buildId, sandboxID, sandboxGUID, jarName, launchDate,isDebug) {
  let resource;
  if (sandboxID > 1){
    core.info('Checking the Sandbox Scan Status')
    const output = await runCommand(
      'java',
      [
        '-jar', jarName,
        '-vid', vid,
        '-vkey', vkey,
        '-action', 'GetBuildInfo',
        '-appid', veracodeApp.appId,
        '-sandboxid', sandboxID,
        '-buildid', buildId,
      ]
    );

    const outputXML = output.toString();

    // Validate XML output before parsing
    if (!outputXML || outputXML.trim().length === 0) {
      throw new Error('Empty XML response from GetBuildInfo command');
    }

    const parser = new xml2js.Parser({attrkey:'att'});
    let result;
    try {
      result = await parser.parseStringPromise(outputXML);
    } catch (parseError) {
      core.error(`Failed to parse XML response: ${parseError.message}`);
      core.error(`Raw XML output: ${outputXML}`);
      throw new Error(`XML parsing error when retrieving scan status: ${parseError.message}`);
    }

    // Validate parsed result structure
    if (!result || !result.buildinfo || !result.buildinfo.build || !Array.isArray(result.buildinfo.build) || result.buildinfo.build.length === 0) {
      throw new Error('Invalid XML structure: missing buildinfo.build array');
    }

    const build = result.buildinfo.build[0];
    if (!build.analysis_unit || !Array.isArray(build.analysis_unit) || build.analysis_unit.length === 0) {
      throw new Error('Invalid XML structure: missing build.analysis_unit array');
    }

    // Safely extract XML attributes with fallbacks
    const statusAttr = build.analysis_unit[0].att && build.analysis_unit[0].att.status;
    const complianceAttr = build.att && build.att.policy_compliance_status;
    const dateAttr = build.analysis_unit[0].att && build.analysis_unit[0].att.published_date;

    if (!statusAttr) {
      throw new Error('Missing required XML attribute: buildinfo.build[0].analysis_unit[0].att.status');
    }
    if (!complianceAttr) {
      throw new Error('Missing required XML attribute: buildinfo.build[0].att.policy_compliance_status');
    }
    if (!dateAttr) {
      throw new Error('Missing required XML attribute: buildinfo.build[0].analysis_unit[0].att.published_date');
    }

    core.info('Veracode Scan Status: '+statusAttr.replace(/ /g,"_").toUpperCase());
    core.info('Veracode Policy Compliance Status: '+complianceAttr.replace(/ /g,"_").toUpperCase());
    core.info('Veracode Scan Date: '+dateAttr);

    return {
      'status': statusAttr.replace(/ /g,"_").toUpperCase(),
      'passFail': complianceAttr.replace(/ /g,"_").toUpperCase(),
      'lastPolicyScanData': dateAttr,
      'scanUpdateDate': launchDate
    }

  }
  else {
    resource = {
      resourceUri: `${appConfig().applicationUri}/${veracodeApp.appGuid}`,
      queryAttribute: '',
      queryValue: ''
    };
    const response = await getResourceByAttribute(vid, vkey, resource,isDebug);

    // Validate response structure
    if (!response || !response.scans || !Array.isArray(response.scans)) {
      core.warning('Invalid response structure: missing scans array');
      return {
        'status': 'not found',
        'passFail': 'not found'
      };
    }

    for(let i = 0; i < response.scans.length; i++) {
      const scan = response.scans[i];

      // Validate scan object
      if (!scan.scan_url) {
        core.debug(`Skipping scan at index ${i}: missing scan_url`);
        continue;
      }

      const scanUrlParts = scan.scan_url.split(':');
      const scanId = scanUrlParts.length > 3 ? scanUrlParts[3] : null;

      if (scanId === buildId) {
        console.log(`Scan Status: ${scan.status}`);

        // Validate response.profile and policies exist
        if (!response.profile || !Array.isArray(response.profile.policies) || response.profile.policies.length === 0) {
          core.warning('Warning: Invalid profile structure in response. policies array not found.');
          return {
            'status': scan.status || 'unknown',
            'passFail': 'unknown',
            'scanUpdateDate': scan.modified_date || launchDate,
            'lastPolicyScanData': response.last_policy_compliance_check_date || 'unknown'
          };
        }

        return {
          'status': scan.status,
          'passFail': response.profile.policies[0].policy_compliance_status,
          'scanUpdateDate': scan.modified_date,
          'lastPolicyScanData': response.last_policy_compliance_check_date
        };
      }
    }

    core.warning(`No scan found with buildId: ${buildId}`);
    return {
      'status': 'not found',
      'passFail': 'not found'
    };
  }
}

async function getVeracodeApplicationFindings(vid, vkey, veracodeApp, buildId, sandboxID, sandboxGUID, platformType, isDebug) {
  console.log("Starting to fetch results");
  console.log("APP GUID: "+veracodeApp.appGuid)
  console.log("API URL: "+appConfig().findingsUri)
  let resource
  if ( sandboxGUID ){
    core.info(`SandboxID: ${sandboxID}`)
    core.info(`SandboxGUID: ${sandboxGUID}`)
    resource = {
      resourceUri: `${appConfig().findingsUri}/${veracodeApp.appGuid}/findings`,
      queryAttribute: 'violates_policy',
      queryValue: 'True',
      queryAttribute2: 'context',
      queryValue2: sandboxGUID
    };
  }
  else {
    resource = {
      resourceUri: `${appConfig().findingsUri}/${veracodeApp.appGuid}/findings`,
      queryAttribute: 'violates_policy',
      queryValue: 'True'
    };
  }
  
  const response = await getResourceByAttribute(vid, vkey, resource,isDebug);

  // Validate response structure
  if (!response || typeof response !== 'object') {
    throw new Error(`Invalid API response when fetching findings. Expected object, got: ${typeof response}`);
  }

  if (!response.page || typeof response.page.total_elements !== 'number') {
    throw new Error(`Invalid response structure: missing or invalid page.total_elements`);
  }

  const resultsUrlBase = 'https://analysiscenter.veracode.com/auth/index.jsp#ViewReportsResultSummary';
  const resultsUrl = `${resultsUrlBase}:${veracodeApp.oid}:${veracodeApp.appId}:${buildId}`;

  try {
    const jsonData = response;
    let newFindings = [];

    if (jsonData.page.total_elements > 0) {
      // Validate _embedded.findings exists and is an array
      if (!jsonData._embedded || !Array.isArray(jsonData._embedded.findings)) {
        core.warning('Warning: Invalid or missing _embedded.findings array in response. No findings to process.');
      } else {
        const findings = jsonData._embedded.findings;
        const fixedSearchTerm = "OPEN"; // Fixed search term
        console.log(findings.length+" findings found");

        console.log("Filtering findings");
        for (let i = 0; i < findings.length; i++) {
          const finding = findings[i];

          // Validate finding object structure
          if (!finding || !finding.finding_status || !finding.finding_status.status) {
            core.debug(`Skipping finding at index ${i}: missing finding_status or finding_status.status`);
            continue;
          }

          if (finding.finding_status.status != fixedSearchTerm) {
            console.log("Finding "+JSON.stringify(finding.issue_id)+" is not open and will be ignored");
            console.log("Finding status: "+JSON.stringify(finding.finding_status.status));
          } else {
            //adding finding to new array
            console.log("Finding "+JSON.stringify(finding.issue_id)+" is open");
            console.log("Finding status: "+JSON.stringify(finding.finding_status.status));
            newFindings.push(finding);
          }
        }
      }
    }

    // Validate _links exists before accessing
    const links = jsonData._links || {};
    const page = jsonData.page || { total_elements: 0 };

    //recreate json output
    const filteredJsonData = "{\"_embedded\": {\"findings\": "+JSON.stringify(newFindings, null, 2)+"}, \"_links\": "+JSON.stringify(links, null, 2)+", \"page\": "+JSON.stringify(page, null, 2)+"}";

    //write to file
    try {
      await fs.writeFile('policy_flaws.json', filteredJsonData);
      core.debug(`Successfully wrote policy_flaws.json with ${newFindings.length} findings`);
    } catch (fileWriteError) {
      core.error(`Failed to write policy_flaws.json: ${fileWriteError.message}`);
      throw fileWriteError;
    }

    try {
      await fs.writeFile('results_url.txt', resultsUrl);
      core.debug(`Successfully wrote results_url.txt`);
    } catch (fileWriteError) {
      core.error(`Failed to write results_url.txt: ${fileWriteError.message}`);
      throw fileWriteError;
    }
  } catch (err) {
    core.error(`Error processing findings: ${err.message}`);
    console.log(err);
    throw err;
  }
  
  //we dont need a proxy for the artifact upload
  // Store current proxy environment variables
  const HTTP_PROXY = process.env.HTTP_PROXY
  const HTTPS_PROXY = process.env.HTTPS_PROXY
  const NO_PROXY = process.env.NO_PROXY
  const http_proxy = process.env.http_proxy
  const https_proxy = process.env.https_proxy
  const no_proxy = process.env.no_proxy

  // Unset proxy environment variables
  delete process.env.HTTP_PROXY
  delete process.env.HTTPS_PROXY
  delete process.env.NO_PROXY
  delete process.env.http_proxy
  delete process.env.https_proxy
  delete process.env.no_proxy

  const { DefaultArtifactClient } = require('@actions/artifact');
  const artifactV1 = require('@actions/artifact-v1');
  let artifactClient;

  if (platformType === 'ENTERPRISE') {
    artifactClient = artifactV1.create();
    core.info(`Initialized the artifact object using version V1.`);
  } else {
    artifactClient = new DefaultArtifactClient();
    core.info(`Initialized the artifact object using version V2.`);
  }

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

  if (HTTP_PROXY) process.env.HTTP_PROXY = HTTP_PROXY
  if (HTTPS_PROXY) process.env.HTTPS_PROXY = HTTPS_PROXY
  if (NO_PROXY) process.env.NO_PROXY = NO_PROXY
  if (http_proxy) process.env.http_proxy = http_proxy
  if (https_proxy) process.env.https_proxy = https_proxy
  if (no_proxy) process.env.no_proxy = no_proxy
}

module.exports = {
  getVeracodeApplicationForPolicyScan,
  createSandboxRequest,
  getVeracodeSandboxIDFromProfile,
  getVeracodeApplicationScanStatus,
  getVeracodeApplicationFindings
}