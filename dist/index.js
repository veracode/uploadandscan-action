/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 261:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const axios = __nccwpck_require__(512);
const { calculateAuthorizationHeader } = __nccwpck_require__(857);
const appConfig = __nccwpck_require__(798);

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

/***/ }),

/***/ 686:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const util = __nccwpck_require__(837);
const { exec, execSync } = __nccwpck_require__(81);
const execPromise = util.promisify(exec);
const core = __nccwpck_require__(105);

const javaWrapperDownloadUrl 
  = 'https://repo1.maven.org/maven2/com/veracode/vosp/api/wrappers/vosp-api-wrappers-java'

async function downloadJar ()  {
  // get the latest version of the Veracode Java wrapper
  let latestVersion;
  const curlCommand = `curl ${javaWrapperDownloadUrl}/maven-metadata.xml`;
  try {
    const { stdout } = await execPromise(curlCommand);
    const lines = stdout.trim().split('\n');
    const regex = /<latest>([\d.]+)<\/latest>/;
    latestVersion = lines.find(line => regex.test(line)).match(regex)[1];
  } catch (error) {
    core.info(`Error executing curl command: ${error.message}`);
  }
  core.info(`Latest version of Veracode Java wrapper: ${latestVersion}`);

  // download the Veracode Java wrapper
  const wgetCommand = `wget ${javaWrapperDownloadUrl}/${latestVersion}/vosp-api-wrappers-java-${latestVersion}.jar`;
  try {
    await execPromise(wgetCommand);
  } catch (error) {
    core.info(`Error executing wget command: ${error.message}`);
  }
  core.info(`Veracode Java wrapper downloaded: vosp-api-wrappers-java-${latestVersion}.jar`);
  return `vosp-api-wrappers-java-${latestVersion}.jar`;
}

async function runCommand (command){
  try {
    return execSync(command);
  } catch (error){
    console.error(error.message);
    return 'failed';
  }
}

module.exports = {
  downloadJar,
  runCommand,
}

/***/ }),

/***/ 857:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const sjcl = __nccwpck_require__(273);
const util = __nccwpck_require__(837);
const crypto = __nccwpck_require__(113);

module.exports.calculateAuthorizationHeader = calculateAuthorizationHeader;

const authorizationScheme = "VERACODE-HMAC-SHA-256";
const requestVersion = "vcode_request_version_1";
const nonceSize = 16;

function computeHashHex(message, key_hex) {
    let key_bits = sjcl.codec.hex.toBits(key_hex);
    let hmac_bits = (new sjcl.misc.hmac(key_bits, sjcl.hash.sha256)).mac(message);
    let hmac = sjcl.codec.hex.fromBits(hmac_bits);
    return hmac;
}

function calulateDataSignature(apiKeyBytes, nonceBytes, dateStamp, data) {
    let kNonce = computeHashHex(nonceBytes, apiKeyBytes);
    let kDate = computeHashHex(dateStamp, kNonce);
    let kSig = computeHashHex(requestVersion, kDate);
    let kFinal = computeHashHex(data, kSig);
    return kFinal;
}

function newNonce() {
    return crypto.randomBytes(nonceSize).toString('hex').toUpperCase();
}

function toHexBinary(input) {
    return sjcl.codec.hex.fromBits(sjcl.codec.utf8String.toBits(input));
}

function calculateAuthorizationHeader(id, key, hostName, uriString, urlQueryParams, httpMethod) {
    uriString += urlQueryParams;
    let data = `id=${id}&host=${hostName}&url=${uriString}&method=${httpMethod}`;
    let dateStamp = Date.now().toString();
    let nonceBytes = newNonce(nonceSize);
    let dataSignature = calulateDataSignature(key, nonceBytes, dateStamp, data);
    let authorizationParam = `id=${id},ts=${dateStamp},nonce=${toHexBinary(nonceBytes)},sig=${dataSignature}`;
    let header = authorizationScheme + " " + authorizationParam;
    return header;
}

/***/ }),

/***/ 798:
/***/ ((module) => {

module.exports = appConfig;

function appConfig() {
  return {
    hostName: 'api.veracode.com',
    policyUri: '/appsec/v1/policies',
    applicationUri: '/appsec/v1/applications',
    findingsUri: '/appsec/v2/applications',
    teamsUri: '/api/authn/v2/teams',
    pollingInterval: 30000,
    moduleSelectionTimeout: 60000,
  };
}

/***/ }),

/***/ 437:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(105);
const appConfig = __nccwpck_require__(798);
const { 
  getResourceByAttribute,
  createResource,
}= __nccwpck_require__(261);
const fs = __nccwpck_require__(292);
const artifact = __nccwpck_require__(715);
const { getVeracodePolicyByName } = __nccwpck_require__(157);
const { getVeracodeTeamsByName } = __nccwpck_require__(305);

async function getApplicationByName(vid, vkey, applicationName) {
  core.debug(`Module: application-service, function: getApplicationByName. Application: ${applicationName}`);
  const resource = {
    resourceUri: appConfig().applicationUri,
    queryAttribute: 'name',
    queryValue: encodeURIComponent(applicationName)
  };
  core.debug(resource);
  const response = await getResourceByAttribute(vid, vkey, resource);
  return response;
}

function profileExists(responseData, applicationName) {
  core.debug(`Module: application-service, function: profileExists. Application: ${applicationName}`);
  if (responseData.page.total_elements === 0) {
    core.debug(`No Veracode application profile found for ${applicationName}`);
    return { exists: false, veracodeApp: null };
  }
  else {
    for(let i = 0; i < responseData._embedded.applications.length; i++) {
      if (responseData._embedded.applications[i].profile.name.toLowerCase() 
            === applicationName.toLowerCase()) {
        return { exists: true, veracodeApp: {
          'appId': responseData._embedded.applications[i].id,
          'appGuid': responseData._embedded.applications[i].guid,
          'oid': responseData._embedded.applications[i].oid,
        } };;
      }
    }
    core.debug(`No Veracode application profile with exact the profile name: ${applicationName}`);
    return { exists: false, veracodeApp: null };
  }
}

async function getVeracodeApplicationForPolicyScan(vid, vkey, applicationName, policyName, teams, createprofile) {
  core.debug(`Module: application-service, function: getVeracodeApplicationForPolicyScan. Application: ${applicationName}`);
  const responseData = await getApplicationByName(vid, vkey, applicationName);
  core.debug(`Check if ${applicationName} is found via Application API`);
  core.debug(responseData);
  const profile = profileExists(responseData, applicationName);
  core.debug(`Check if ${applicationName} has a Veracode application profile`);
  core.debug(profile);
  if (!profile.exists) {
    if (createprofile.toLowerCase() !== 'true')
      return { 'appId': -1, 'appGuid': -1, 'oid': -1 };
    
    const veracodePolicy = await getVeracodePolicyByName(vid, vkey, policyName);
    core.debug(`Veracode Policy: ${veracodePolicy}`)
    const veracodeTeams = await getVeracodeTeamsByName(vid, vkey, teams);
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
          teams: veracodeTeams
        }
      }
    };
    core.debug(`Create Veracode application profile: ${JSON.stringify(resource)}`);
    const response = await createResource(vid, vkey, resource);
    core.debug(`Veracode application profile created: ${JSON.stringify(response)}`);
    const appProfile = response.app_profile_url;
    return {
      'appId': response.id,
      'appGuid': response.guid,
      'oid': appProfile.split(':')[1]
    };
  } else return profile.veracodeApp;
}

async function getVeracodeApplicationScanStatus(vid, vkey, veracodeApp, buildId) {
  const resource = {
    resourceUri: `${appConfig().applicationUri}/${veracodeApp.appGuid}`,
    queryAttribute: '',
    queryValue: ''
  };
  const response = await getResourceByAttribute(vid, vkey, resource);
  const scans = response.scans;
  for(let i = 0; i < scans.length; i++) {
    const scanUrl = scans[i].scan_url;
    const scanId = scanUrl.split(':')[3];
    if (scanId === buildId) {
      console.log(`Scan Status: ${scans[i].status}`);
      return {
        'status': scans[i].status,
        'passFail': response.profile.policies[0].policy_compliance_status,
        'scanUpdateDate': scans[i].modified_date,
        'lastPolicyScanData': response.last_policy_compliance_check_date
      };
    }
  }
  return { 
    'status': 'not found', 
    'passFail': 'not found'
  };
}

async function getVeracodeApplicationFindings(vid, vkey, veracodeApp, buildId) {
  console.log("Starting to fetch results");
  const resource = {
    resourceUri: `${appConfig().findingsUri}/${veracodeApp.appGuid}/findings`,
    queryAttribute: 'violates_policy',
    queryValue: 'True'
  };
  console.log("APP GUID: "+veracodeApp.appGuid)
  console.log("API URL: "+resource.resourceUri)
  const response = await getResourceByAttribute(vid, vkey, resource);
  const resultsUrlBase = 'https://analysiscenter.veracode.com/auth/index.jsp#ViewReportsResultSummary';
  const resultsUrl = `${resultsUrlBase}:${veracodeApp.oid}:${veracodeApp.appId}:${buildId}`;
  // save response to policy_flaws.json
  // save resultsUrl to results_url.txt
  try {
    const jsonData = response;

    let newFindings = [];
    if (jsonData.page.total_elements > 0) {
      //filter the resutls to only include the flaws that violate the policy
      const findings = jsonData._embedded.findings;
      const fixedSearchTerm = "OPEN"; // Fixed search term
      console.log(findings.length+" findings found");

      console.log("Filtering findings");
      for ( i=0 ; i <= findings.length-1 ; i++ ) {
          if ( findings[i].finding_status.status != fixedSearchTerm ){
              console.log("Finding "+JSON.stringify(findings[i].issue_id)+" is not open and will be ignored");
              console.log("Finding status: "+JSON.stringify(findings[i].finding_status.status));
          }
          else {
              //adding finding to new array
              console.log("Finding "+JSON.stringify(findings[i].issue_id)+" is open");
              console.log("Finding status: "+JSON.stringify(findings[i].finding_status.status));
              newFindings.push(findings[i]);
          }
      }
    }

    //recreate json output
    const links = jsonData._links;
    const page = jsonData.page;
    const filteredJsonData = "{\"_embedded\": {\"findings\": "+JSON.stringify(newFindings, null, 2)+"}, \"_links\": "+JSON.stringify(links, null, 2)+", \"page\": "+JSON.stringify(page, null, 2)+"}";

    //write to file
    await fs.writeFile('policy_flaws.json', filteredJsonData);
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
  getVeracodeApplicationScanStatus,
  getVeracodeApplicationFindings
}

/***/ }),

/***/ 157:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(105);
const appConfig = __nccwpck_require__(798);
const { 
  getResourceByAttribute,
  createResource,
}= __nccwpck_require__(261);

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

/***/ }),

/***/ 972:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { runCommand } = __nccwpck_require__(686);
const xml2js = __nccwpck_require__(662);
const { minimatch } = __nccwpck_require__(588)

async function createBuild(vid, vkey, jarName, appId, version, deleteincompletescan) {
  const command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action CreateBuild -appid ${appId} -version ${version}`
  var output = await runCommand(command);
  if (output === 'failed' && deleteincompletescan === 'false'){
    throw new Error(`Error creating build: ${output}`);
  }
  else if (output === 'failed' && deleteincompletescan === 'true'){
    const deleteCommand = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action DeleteBuild -appid ${appId} -version ${version}`
    const deleteOutput = await runCommand(deleteCommand);
    if (deleteOutput === 'failed'){
      throw new Error(`Error deleting build: ${deleteOutput}`);
    }
    else 
    output = await runCommand(command);
      if (output === 'failed'){
        throw new Error(`Error creating build: ${createOutput}`);
    }
  }

  const outputXML = output.toString();
  // parse outputXML for build_id
  const regex = /<build build_id="(\d+)"/;
  let buildId = '';
  try {
    buildId = outputXML.match(regex)[1];
  } catch (error) {
    throw new Error(`Error parsing build_id from outputXML: ${error.message}`);
  }
  return buildId;
}

async function uploadFile(vid, vkey, jarName, appId, filepath) {
  const command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action UploadFile -appid ${appId} -filepath ${filepath}`
  const output = await runCommand(command);
  const outputXML = output.toString();
  return outputXML.indexOf('Uploaded') > -1;
}

async function beginPreScan(vid, vkey, jarName, appId, autoScan) {
  const command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action BeginPrescan -appid ${appId} -autoscan ${autoScan}`
  const output = await runCommand(command);
  const outputXML = output.toString();
  return outputXML.indexOf('Pre-Scan Submitted') > -1;
}

async function checkPrescanSuccess(vid, vkey, jarName, appId) {
  const command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action GetBuildInfo -appid ${appId}`
  const output = await runCommand(command);
  const outputXML = output.toString();
  return outputXML.indexOf('Pre-Scan Success') > -1;
}

async function getModules(vid, vkey, jarName, appId, include) {
  const command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action GetPreScanResults -appid ${appId}`
  const output = await runCommand(command);
  const outputXML = output.toString();
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(outputXML);
  let modules = [];
  result.prescanresults.module.forEach(module => {
    modules.push({
      id: module.$.id,
      name: module.$.name,
      status: module.$.status,
      issues: module.issue,
      fileIssues: module.file_issue
    });
  });

  const modulesToScan = include.trim().split(',');
  let moduleIds = [];
  modulesToScan.forEach(moduleName => {
    modules.forEach(m => {
      if (m.name && minimatch(m.name.toLowerCase(), moduleName.trim().toLowerCase())) {
        moduleIds.push(m.id);
      }
    });
  });
  return moduleIds;
}

async function beginScan(vid, vkey, jarName, appId, moduleIds) {
  const command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action BeginScan -appid ${appId} -modules ${moduleIds}`
  const output = await runCommand(command);
  const outputXML = output.toString();
  return outputXML.indexOf('Submitted to Engine') > -1;
}

async function checkScanSuccess(vid, vkey, jarName, appId, buildId) {
  const command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action GetBuildInfo -appid ${appId}`
  const output = await runCommand(command);
  const outputXML = output.toString();
  if (outputXML.indexOf('Results Ready') > -1) {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(outputXML);
    let passFail = 'Did Not Pass';
    result.buildinfo.build.forEach(build => {
      if (build.build_id === buildId) {
        if (build.$.policy_compliance_status === 'Calculating...') return { 'scanCompleted' : false };
        passFail = build.$.policy_compliance_status;
      }
    });
    return { 'scanCompleted' : true, 'passFail' : passFail}
  }
  return { 'scanCompleted' : false };
}

module.exports = {
  createBuild,
  uploadFile,
  beginPreScan,
  checkPrescanSuccess,
  getModules,
  beginScan,
  checkScanSuccess
}

/***/ }),

/***/ 305:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(105);
const appConfig = __nccwpck_require__(798);
const { 
  getResourceByAttribute,
}= __nccwpck_require__(261);

async function getTeamsByName (vid, vkey, teamName)  {
  const resource = {
    resourceUri: appConfig().teamsUri,
    queryAttribute: 'team_name',
    queryValue: encodeURIComponent(teamName)
  };
  const response = await getResourceByAttribute(vid, vkey, resource);
  return response;
}

async function getVeracodeTeamsByName(vid, vkey, teams) {
  core.debug(`Module: teams-service, function: getVeracodeTeamsByName. teams: ${teams}`);
  if (teams !== '') {
    const teamsName = teams.trim().split(',');
    let teamGuids = [];
    for (let index = 0; index < teamsName.length; index++) {
      const teamName = teamsName[index].trim();
      const responseData = await getTeamsByName(vid, vkey, teamName);
      if (responseData.page.total_elements !== 0) {
        for(let i = 0; i < responseData._embedded.teams.length; i++) {
          if (responseData._embedded.teams[i].team_name.toLowerCase()
                === teamName.toLowerCase()) {
            teamGuids.push({
              "guid": responseData._embedded.teams[i].team_id
            })
          }
        }
      }
    }
    return teamGuids;
  }
  return [];
}

module.exports = {
  getVeracodeTeamsByName,
};

/***/ }),

/***/ 715:
/***/ ((module) => {

module.exports = eval("require")("@actions/artifact");


/***/ }),

/***/ 105:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 512:
/***/ ((module) => {

module.exports = eval("require")("axios");


/***/ }),

/***/ 588:
/***/ ((module) => {

module.exports = eval("require")("minimatch");


/***/ }),

/***/ 273:
/***/ ((module) => {

module.exports = eval("require")("sjcl");


/***/ }),

/***/ 662:
/***/ ((module) => {

module.exports = eval("require")("xml2js");


/***/ }),

/***/ 81:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 113:
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ 292:
/***/ ((module) => {

"use strict";
module.exports = require("fs/promises");

/***/ }),

/***/ 837:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(105);
const { getVeracodeApplicationForPolicyScan, getVeracodeApplicationScanStatus, getVeracodeApplicationFindings
} = __nccwpck_require__(437);
const { downloadJar } = __nccwpck_require__(686);
const { createBuild, uploadFile, beginPreScan, checkPrescanSuccess, getModules, beginScan, checkScanSuccess
} = __nccwpck_require__(972);
const appConfig = __nccwpck_require__(798);

const vid = core.getInput('vid', { required: true });
const vkey = core.getInput('vkey', { required: true });
const appname = core.getInput('appname', { required: true });
const version = core.getInput('version', { required: true });
const filepath = core.getInput('filepath', { required: true });
const createprofile = core.getInput('createprofile', { required: true });
const include = core.getInput('include', { required: false });
const policy = core.getInput('policy', { required: false });
const teams = core.getInput('teams', { required: false });
const scantimeout = core.getInput('scantimeout', { required: false });
const deleteincompletescan = core.getInput('deleteincompletescan', { required: false });
const failbuild = core.getInput('failbuild', { required: false });

const POLICY_EVALUATION_FAILED = 9;
const SCAN_TIME_OUT = 8;

function checkParameters() {
  if (vid === '' || vkey === '' || appname === '' || version === '' || filepath === '') {
    core.setFailed('vid, vkey, appname, version, and filepath are required');
    return false;
  }
  if (createprofile.toLowerCase() !== 'true' && createprofile.toLowerCase() !== 'false') {
    core.setFailed('createprofile must be set to true or false');
    return false;
  }
  if (isNaN(scantimeout)) {
    core.setFailed('scantimeout must be a number');
    return false;
  }
  if (failbuild.toLowerCase() !== 'true' && failbuild.toLowerCase() !== 'false') {
    core.setFailed('failbuild must be set to true or false');
    return false;
  }
  if (deleteincompletescan.toLowerCase() !== 'true' && deleteincompletescan.toLowerCase() !== 'false') {
    core.setFailed('deleteincompletescan must be set to true or false');
    return false;
  }
  return true;
}

async function run() {
  let responseCode = 0;

  if (!checkParameters())
    return;

  core.debug(`Getting Veracode Application for Policy Scan: ${appname}`)
  const veracodeApp = await getVeracodeApplicationForPolicyScan(vid, vkey, appname, policy, teams, createprofile);
  if (veracodeApp.appId === -1) {
    core.setFailed(`Veracode application profile Not Found. Please create a profile on Veracode Platform, \
      or set "createprofile" to "true" in the pipeline configuration to automatically create profile.`);
    return;
  }
  core.info(`Veracode App Id: ${veracodeApp.appId}`);
  core.info(`Veracode App Guid: ${veracodeApp.appGuid}`);

  const jarName = await downloadJar();

  let buildId;
  try {
    buildId = await createBuild(vid, vkey, jarName, veracodeApp.appId, version, deleteincompletescan);  
    core.info(`Veracode Policy Scan Created, Build Id: ${buildId}`);
  } catch (error) {
    core.setFailed('Failed to create Veracode Policy Scan. App not in state where new builds are allowed.');
    return;
  }

  const uploaded = await uploadFile(vid, vkey, jarName, veracodeApp.appId, filepath);
  core.info(`Artifact(s) uploaded: ${uploaded}`);

  // return and exit the app if the duration of the run is more than scantimeout
  let endTime = new Date();
  if (scantimeout !== '') {
    const startTime = new Date();
    endTime = new Date(startTime.getTime() + scantimeout * 1000 * 60);
  }

  core.info(`scantimeout: ${scantimeout}`);
  core.info(`include: ${include}`)
  
  if (include === '') {
    const autoScan = true;
    await beginPreScan(vid, vkey, jarName, veracodeApp.appId, autoScan);
    if (scantimeout === '') {
      core.info('Static Scan Submitted, please check Veracode Platform for results');
      return;
    }
  } else {
    const autoScan = false;
    const prescan = await beginPreScan(vid, vkey, jarName, veracodeApp.appId, autoScan);
    core.info(`Pre-Scan Submitted: ${prescan}`);
    while (true) {
      await sleep(appConfig().pollingInterval);
      core.info('Checking for Pre-Scan Results...');
      if (await checkPrescanSuccess(vid, vkey, jarName, veracodeApp.appId)) {
        core.info('Pre-Scan Success!');
        break;
      }
      if (scantimeout !== '' && endTime < new Date()) {
        if (failbuild.toLowerCase() === 'true')
          core.setFailed(`Veracode Policy Scan Exited: Scan Timeout Exceeded`);
        else
          core.info(`Veracode Policy Scan Exited: Scan Timeout Exceeded`)
        return;
      }
    }

    const moduleIds = await getModules(vid, vkey, jarName, veracodeApp.appId, include);
    core.info(`Modules to Scan: ${moduleIds.toString()}`);
    const scan = await beginScan(vid, vkey, jarName, veracodeApp.appId, moduleIds.toString());
    core.info(`Scan Submitted: ${scan}`);
  }

  core.info('Waiting for Scan Results...');
  let moduleSelectionStartTime = new Date();
  let moduleSelectionCount = 0;
  while (true) {
    await sleep(appConfig().pollingInterval);
    core.info('Checking Scan Results...');
    const statusUpdate = await getVeracodeApplicationScanStatus(vid, vkey, veracodeApp, buildId);
    if (statusUpdate.status === 'MODULE_SELECTION_REQUIRED') {
      moduleSelectionCount++;
      if (moduleSelectionCount === 1)
        moduleSelectionStartTime = new Date();
      if (new Date() - moduleSelectionStartTime > appConfig().moduleSelectionTimeout) {
        core.setFailed('Veracode Policy Scan Exited: Module Selection Timeout Exceeded. ' +
          'Please review the scan on Veracode Platform.' + 
          `https://analysiscenter.veracode.com/auth/index.jsp#HomeAppProfile:${veracodeApp.oid}:${veracodeApp.appId}`);
        responseCode = SCAN_TIME_OUT;
        return responseCode;
      }
    }
    if (statusUpdate.status === 'PUBLISHED' && statusUpdate.scanUpdateDate) {
      const scanDate = new Date(statusUpdate.scanUpdateDate);
      const policyScanDate = new Date(statusUpdate.lastPolicyScanData);
      if (!policyScanDate || scanDate < policyScanDate) {
        if (statusUpdate.passFail === 'DID_NOT_PASS' && failbuild.toLowerCase() === 'true'){
          core.setFailed('Policy Violation: Veracode Policy Scan Failed');
          responseCode = POLICY_EVALUATION_FAILED;
        }
        else
          core.info(`Policy Evaluation: ${statusUpdate.passFail}`)
        break;
      } else {
        core.info(`Policy Evaluation: ${statusUpdate.passFail}`)
      }
    }
    
    if (endTime < new Date()) {
      core.setFailed(`Veracode Policy Scan Exited: Scan Timeout Exceeded`);
      responseCode = SCAN_TIME_OUT;
      return responseCode;
    }
  }
  await getVeracodeApplicationFindings(vid, vkey, veracodeApp, buildId);
  return responseCode;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

run();
})();

module.exports = __webpack_exports__;
/******/ })()
;