/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 292:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {


const { calculateAuthorizationHeader } = __nccwpck_require__(342);
const { getHostAndCredentials } = __nccwpck_require__(855)
const core = __nccwpck_require__(695);
const { setGlobalDispatcher,ProxyAgent, fetch } = __nccwpck_require__(662)


function getProxy(isDebug) {
  core.debug('--  getProxy() - START  --');
  const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY;
  const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  const proxyHost = process.env.PROXY_HOST;
  const proxyPort = process.env.PROXY_PORT;
  const proxyUser = process.env.PROXY_USER;
  const proxyPass = process.env.PROXY_PASS;
  const proxyProtocol = process.env.PROXY_PROTOCOL || 'http';

  if (httpProxy || httpsProxy || (proxyHost && proxyPort)) {
    let uri = httpsProxy || httpProxy || `${proxyProtocol}://${proxyHost}:${proxyPort}`;
    let proxyAttr = {uri};

    if (proxyUser && proxyPass) {
      if (isDebug) {
        core.info('found user and password - setting up \'token\' attribute in the proxy settings');
      }
      proxyAttr['token'] = `Basic ${Buffer.from(`${proxyUser}:${proxyPass}`).toString('base64')}`
    }
    if (isDebug) {
      core.info('---- DEBUG OUTPUT START ----')
      core.info('---- getProxy ----')
      core.info('---- proxyAttr: ' + JSON.stringify(proxyAttr,null,2))
      core.info('---- http_proxy: ' + httpProxy)
      core.info('---- https_proxy: ' + httpsProxy)
      core.info('---- proxy user: ' + proxyUser)
      core.info('---- proxy pass provided: ' + (proxyPass && proxyPass.length>0))      
      core.info('---- DEBUG OUTPUT END ----')  
    }
    const proxyAgent = new ProxyAgent(proxyAttr);
    core.debug(`---- Global Proxy Set to: ${uri} ---`);
    core.debug('--  getProxy() - END  --');
    return proxyAgent;
  } else {
    if (isDebug) {
      core.info('---- DEBUG OUTPUT START ----')
      core.info('---- getProxy ----')
      core.info('---- NO Proxy host or port provided -> No proxy will be used for API calls  ----')
      core.info('---- DEBUG OUTPUT END ----')  
    }
  }
  core.debug('--  getProxy() - END  --');
  return null;
}

function setGlobalProxy(isDebug) {
  core.debug('--  setGlobalProxy() - START  --');
  const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY;
  const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  const proxyHost = process.env.PROXY_HOST;
  const proxyPort = process.env.PROXY_PORT;
  const proxyUser = process.env.PROXY_USER;
  const proxyPass = process.env.PROXY_PASS;
  const proxyProtocol = process.env.PROXY_PROTOCOAL || 'http';

  if (httpProxy || httpsProxy || (proxyHost && proxyPort)) {
    let uri = httpsProxy || httpProxy || `${proxyProtocol}://${proxyHost}:${proxyPort}`;
    let proxyAttr = {uri};

    if (proxyUser && proxyPass) {
      proxyAttr['token'] = `Basic ${Buffer.from(`${proxyUser}:${proxyPass}`).toString('base64')}`
    }
    if (isDebug) {
      core.info('---- DEBUG OUTPUT START ----')
      core.info('---- setGlobalProxy ----')
      core.info('---- proxyAttr: ' + JSON.stringify(proxyAttr,null,2))
      core.info('---- http_proxy: ' + (process.env.HTTP_PROXY || process.env.http_proxy))
      core.info('---- https_proxy: ' + (process.env.HTTPS_PROXY || process.env.https_proxy))
      core.info('---- proxy user: ' + proxyUser)
      core.info('---- proxy pass provided: ' + (proxyPass && proxyPass.length>0))      
      core.info('---- DEBUG OUTPUT END ----')  
    }
    const proxyAgent = new ProxyAgent(proxyAttr);
    setGlobalDispatcher(proxyAgent);
    core.debug(`---- Global Proxy Set to: ${uri} ---`);
  } else {
    if (isDebug) {
      core.info('---- DEBUG OUTPUT START ----')
      core.info('---- setGlobalProxy ----')
      core.info('---- NO Proxy host or port provided -> No proxy will be used for API calls ----')
      core.info('---- DEBUG OUTPUT END ----')  
    }
  }
  core.debug('--  setGlobalProxy() - END  --');
}

async function getResourceByAttribute (vid, vkey, resource,isDebug) {
  const resourceUri = resource.resourceUri;
  const queryAttribute = resource.queryAttribute;
  const queryValue = resource.queryValue;
  const queryAttribute2 = resource.queryAttribute2;
  const queryValue2 = resource.queryValue2;
  var urlQueryParams = queryAttribute !== '' ? `?${queryAttribute}=${queryValue}` : '';
  if ( queryAttribute2 ){
    urlQueryParams = urlQueryParams+`&${queryAttribute2}=${queryValue2}`;
  }


  const { host, vid: updatedVid, vkey: updatedVkey } = getHostAndCredentials(vid, vkey);
  const headers = {
    'Authorization': calculateAuthorizationHeader(updatedVid, updatedVkey, host, resourceUri, 
      urlQueryParams, 'GET')
  };


  const appUrl = `https://${host}${resourceUri}${urlQueryParams}`;

  if (isDebug) {
    core.info('---- DEBUG OUTPUT START ----')
    core.info('---- getResourceByAttribute - request settings ----')
    core.info('---- req url: ' + appUrl)
    core.info('---- http_proxy: ' + (process.env.HTTP_PROXY || process.env.http_proxy))
    core.info('---- https_proxy: ' + (process.env.HTTPS_PROXY || process.env.https_proxy))
    core.info('---- headers: ' + JSON.stringify(headers))
    core.info('---- DEBUG OUTPUT END ----')  
  }

  // Get Proxy
  //let proxy = getProxy(isDebug);
  //core.info(proxy);
  try {
    const fetchOptions = { headers };
    //   headers,
    //   ...(proxy && {dispatcher:proxy}) // We use global proxy setting
    // };
    core.info(fetchOptions);
    // Make the request
    const response = await fetch(appUrl,fetchOptions);
    const data = await response.json();

    if (isDebug) {
        core.info('---- DEBUG OUTPUT START ----');
        core.info('---- getResourceByAttribute - post resource response ----');
        core.info('---- Response Status: ' + response.status);
        core.info('---- Response Status Text: ' + response.statusText);
        core.info('---- Response URL: ' + response.url);
        core.info('---- Response OK: ' + response.ok);
        core.info('---- Response Type: ' + response.type);
        core.info('---- Response Data:');
        try {
          core.info(JSON.stringify(data,null,2));
        } catch (stringifyError) {
          core.into('---- Response data is not JSON');
          core.info(data);
        }
        core.info('---- DEBUG OUTPUT END ----')
    }

    // if (proxy) {
    //   // Close the proxy
    //   await proxy.close();
    // }

    return data;
  } catch (error) {
    core.info('--- Cought error in getResourceByAttribute ---');
    console.error(error);
    // if (proxy) {
    //   // Close the proxy
    //   await proxy.close();
    // }
  } 
}

async function getResource (vid, vkey, resource,isDebug) {
  const resourceUri = resource.resourceUri;
  const { host, vid: updatedVid, vkey: updatedVkey } = getHostAndCredentials(vid, vkey);
  const headers = {
    'Authorization': calculateAuthorizationHeader(updatedVid, updatedVkey, host, resourceUri, '', 'GET')
  };
  const appUrl = `https://${host}${resourceUri}`;
  // Get Proxy
  //let proxy = getProxy(isDebug);

  if (isDebug) {
    core.info('---- DEBUG OUTPUT START ----')
    core.info('---- getResource - request settings ----')
    core.info('---- req url: ' + appUrl)
    core.info('---- http_proxy: ' + (process.env.HTTP_PROXY || process.env.http_proxy))
    core.info('---- https_proxy: ' + (process.env.HTTPS_PROXY || process.env.https_proxy))
    core.info('---- headers: ' + JSON.stringify(headers))
    core.info('---- DEBUG OUTPUT END ----')  
  }

  try {

    const response = await fetch(appUrl,{ headers });
    //   headers,
    //   ...(proxy && {dispatcher:proxy})
    // });

    const data = await response.json();

    // if (proxy) {
    //   // Close the proxy
    //   await proxy.close();
    // }
    // return the data
    return data;

  } catch (error) {
    console.error(error);
    // if (proxy) {
    //   // Close the proxy
    //   await proxy.close();
    // }
  }
}

async function createResource(vid, vkey, resource,isDebug) {
  const resourceUri = resource.resourceUri;
  const resourceData = resource.resourceData;
  const { host, vid: updatedVid, vkey: updatedVkey } = getHostAndCredentials(vid, vkey);
  const headers = {
    'Authorization': calculateAuthorizationHeader(updatedVid, updatedVkey, host, resourceUri, '', 'POST'),
    "Content-Type": "application/json"
  };

  // Get Proxy
  //let proxy = getProxy(isDebug);

  const appUrl = `https://${host}${resourceUri}`;
  try {

    const response = await fetch(appUrl,{ 
      method: 'POST',
      headers: headers,
      body: JSON.stringify(resourceData) //,
//      ...(proxy && {dispatcher:proxy})
      });

    // if (proxy) {
    //   // Close the proxy
    //   await proxy.close();
    // }
    return data = await response.json();

  } catch (error) {
    console.error(error);
    // if (proxy) {
    //   // Close the proxy
    //   await proxy.close();
    // }
  }
}

module.exports = {
  getResourceByAttribute,
  getResource,
  createResource,
  setGlobalProxy
};

/***/ }),

/***/ 447:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const util = __nccwpck_require__(23);
const { exec, execFileSync } = __nccwpck_require__(317);
const execPromise = util.promisify(exec);
const core = __nccwpck_require__(695);

const javaWrapperDownloadUrl 
  = 'https://repo1.maven.org/maven2/com/veracode/vosp/api/wrappers/vosp-api-wrappers-java'

async function downloadJar ()  {
  // get the latest version of the Veracode Java wrapper
  let latestVersion;
  const runnerOS = process.env.RUNNER_OS;
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
  if(runnerOS == 'Windows'){
    const outFileName = `vosp-api-wrappers-java-${latestVersion}.jar`
    const jarUrl = `${javaWrapperDownloadUrl}/${latestVersion}/vosp-api-wrappers-java-${latestVersion}.jar`
    const powershellCommand = `powershell.exe Invoke-WebRequest -Uri "${jarUrl}" -OutFile "${outFileName}"`
    try {
      await execPromise(powershellCommand);
    } catch (error) {
      core.info(`Error executing powershell command: ${error.message}`);
    }

  }else{
    const wgetCommand = `wget ${javaWrapperDownloadUrl}/${latestVersion}/vosp-api-wrappers-java-${latestVersion}.jar`;
    try {
      await execPromise(wgetCommand);
    } catch (error) {
      core.info(`Error executing wget command: ${error.message}`);
    }
  }
  core.info(`Veracode Java wrapper downloaded: vosp-api-wrappers-java-${latestVersion}.jar`);
  return `vosp-api-wrappers-java-${latestVersion}.jar`;
}

async function runCommand (command, args = []){
  try {
    return execFileSync(command, args, { encoding: 'utf-8' });
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

/***/ 342:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const sjcl = __nccwpck_require__(640);
const util = __nccwpck_require__(23);
const crypto = __nccwpck_require__(982);

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

/***/ 936:
/***/ ((module) => {

module.exports = appConfig;

function appConfig() {
  return {
    us: 'api.veracode.com',
    eu: 'api.veracode.eu',
    policyUri: '/appsec/v1/policies',
    applicationUri: '/appsec/v1/applications',
    findingsUri: '/appsec/v2/applications',
    teamsUri: '/api/authn/v2/teams',
    pollingInterval: 30000,
    moduleSelectionTimeout: 60000,
  };
}


/***/ }),

/***/ 907:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(695);
const appConfig = __nccwpck_require__(936);
const { 
  getResourceByAttribute,
  getResource,
  createResource,
}= __nccwpck_require__(292);
const fs = __nccwpck_require__(943);
const { getVeracodePolicyByName } = __nccwpck_require__(807);
const { getVeracodeTeamsByName } = __nccwpck_require__(787);
const { runCommand } = __nccwpck_require__(447);
const xml2js = __nccwpck_require__(736);

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
  if (responseData == null || responseData.page == null ) {
    core.warning("Invalid response data");
    try {
      core.info(JSON.stringify(responseData,null,2));
    } catch (stringifyError) {
      core.warning("Failed to stringify the response data");
      core.info(responseData);
    }
    return { exists: false, veracodeApp: null };
  }

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
    const appProfile = response.app_profile_url;
    return {
      'appId': response.id,
      'appGuid': response.guid,
      'oid': appProfile.split(':')[1]
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
    const parser = new xml2js.Parser({attrkey:'att'});
    const result = await parser.parseStringPromise(outputXML);
    core.info('Veracode Scan Status: '+result.buildinfo.build[0].analysis_unit[0].att.status.replace(/ /g,"_").toUpperCase());
    core.info('Veracode Policy Compliance Status: '+result.buildinfo.build[0].att.policy_compliance_status.replace(/ /g,"_").toUpperCase());
    core.info('Veracode Scan Date: '+result.buildinfo.build[0].analysis_unit[0].att.published_date);
    return {
      'status': result.buildinfo.build[0].analysis_unit[0].att.status.replace(/ /g,"_").toUpperCase(),
      'passFail': result.buildinfo.build[0].att.policy_compliance_status.replace(/ /g,"_").toUpperCase(),
      'lastPolicyScanData': result.buildinfo.build[0].analysis_unit[0].att.published_date,
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

  const { DefaultArtifactClient } = __nccwpck_require__(728);
  const artifactV1 = __nccwpck_require__(10);
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

/***/ }),

/***/ 807:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(695);
const appConfig = __nccwpck_require__(936);
const { 
  getResourceByAttribute,
  createResource,
}= __nccwpck_require__(292);

async function getPolicyByName (vid, vkey, policyName,isDebug)  {
  const resource = {
    resourceUri: appConfig().policyUri,
    queryAttribute: 'name',
    queryValue: encodeURIComponent(policyName)
  };
  const response = await getResourceByAttribute(vid, vkey, resource,isDebug);
  return response;
}

async function getVeracodePolicyByName(vid, vkey, policyName,isDebug) {
  core.debug(`Module: policy-service, function: getVeracodePolicyByName. policyName: ${policyName}`);
  if (policyName !== '') {
    const responseData = await getPolicyByName(vid, vkey, policyName,isDebug);
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

/***/ 32:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { runCommand } = __nccwpck_require__(447);
const xml2js = __nccwpck_require__(736);
const { minimatch } = __nccwpck_require__(726);
const core = __nccwpck_require__(695);
const fs = __nccwpck_require__(896);
const util = __nccwpck_require__(23);

async function createBuild(vid, vkey, jarName, appId, version, deleteincompletescan, debug) {
  const createBuildCommand = 'java';
  const createBuildArguments = [
    '-jar', jarName,
    '-vid', vid,
    '-vkey', vkey,
    '-action', 'CreateBuild',
    '-appid', appId,
    '-version', version,
  ];
  if (debug)
    createBuildArguments.push('-debug');
  let output = await runCommand(createBuildCommand, createBuildArguments);
  if (output === 'failed' && deleteincompletescan === 'false') {
    throw new Error(`Error creating build: ${output}`);
  }
  else if (output === 'failed' && deleteincompletescan === 'true') {
    const deleteArgs = [
      '-jar', jarName,
      '-vid', vid,
      '-vkey', vkey,
      '-action', 'DeleteBuild',
      '-appid', appId,
      '-version', version
    ];
    if (debug)
      deleteArgs.push('-debug');
    const deleteOutput = await runCommand('java', deleteArgs);
    if (deleteOutput === 'failed') {
      throw new Error(`Error deleting build: ${deleteOutput}`);
    }
    else {
      output = await runCommand(createBuildCommand, createBuildArguments);
      if (output === 'failed'){
        throw new Error(`Error creating build: ${output}`);
      }
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

async function createSandboxBuild(vid, vkey, jarName, appId, version, deleteincompletescan, sandboxID, debug) {
  if (debug)
    core.debug(`Module: scan-service, function: createSandboxBuild. Action:CreateBuild  Application: ${appId}`);
  const createBuildCommand = 'java';
  const createBuildArguments = [
    '-jar', jarName,
    '-vid', vid,
    '-vkey', vkey,
    '-action', 'CreateBuild',
    '-sandboxid', sandboxID,
    '-appid', appId,
    '-version', version
  ];
  if (debug)
    createBuildArguments.push('-debug');
  let output = await runCommand(createBuildCommand, createBuildArguments);
  if (debug)
    core.debug(output);
  if (output === 'failed' && deleteincompletescan === 'false') {
    throw new Error(`Error creating build: ${output}`);
  } else if (output === 'failed' && deleteincompletescan === 'true') {
      const deleteArgs = [
        '-jar', jarName,
        '-vid', vid,
        '-vkey', vkey,
        '-action', 'DeleteBuild',
        '-sandboxid', sandboxID,
        '-appid', appId
      ];
      if (debug) {
        core.debug(`Module: scan-service, function: createSandboxBuild. Action:DeleteBuild Application: ${appId}`);
        deleteArgs.push('-debug');
      }
      const deleteOutput = await runCommand('java', deleteArgs);
      if (debug)
        core.debug(deleteOutput);
      if (deleteOutput === 'failed') {
        throw new Error(`Error deleting build: ${deleteOutput}`);
      } else {
        if (debug)
          core.debug(`Module: scan-service, function: createSandboxBuild. Action:CreateBuild Retry  Application: ${appId}`);
        output = await runCommand(createBuildCommand, createBuildArguments);
        if (debug)
          core.debug(output);
        if (output === 'failed') {
          throw new Error(`Error creating build`);
        }
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


async function uploadFile(vid, vkey, jarName, appId, filepath, sandboxID, debug) {
  let count = 0;

  const stat = util.promisify(fs.stat);
  const stats = await stat(filepath);

  if (stats.isFile()) {
    console.log(`${filepath} is a file.`);
    if (sandboxID > 1) {
      core.info(`Uploading artifact (${filepath}) to Sandbox: ${sandboxID}`);
      const uploadArgs = [
        '-jar', jarName,
        '-vid', vid,
        '-vkey', vkey,
        '-action', 'UploadFile',
        '-appid', appId,
        '-filepath', filepath,
        '-sandboxid', sandboxID
      ];
      if (debug)
        uploadArgs.push('-debug');
      const output = await runCommand('java', uploadArgs);
      const outputXML = output.toString();
      console.log(outputXML.indexOf('Uploaded'));
      count++;
    }
    else {
      core.info(`Uploading artifact (${filepath}) to Policy Scan`);
      const uploadArgs = [
        '-jar', jarName,
        '-vid', vid,
        '-vkey', vkey,
        '-action', 'UploadFile',
        '-appid', appId,
        '-filepath', filepath,
      ];
      if (debug)
        uploadArgs.push('-debug');
      const output = await runCommand('java', uploadArgs);
      const outputXML = output.toString();
      if (debug)
        core.debug(`Upload response: ${outputXML}`);
      console.log(outputXML.indexOf('Uploaded'));
      count++;
    }
  }
  else if (stats.isDirectory()) {
    console.log(`${filepath} is a directory.`);

    const filesPromis = util.promisify(fs.readdir);
    const files = await filesPromis(filepath);
    for (const file of files) {
      if (sandboxID > 1) {
        core.info(`Uploading artifact ${file} to Sandbox: ${sandboxID}`);
        const uploadArgs = [
          '-jar', jarName,
          '-vid', vid,
          '-vkey', vkey,
          '-action', 'UploadFile',
          '-appid', appId,
          '-filepath', filepath,
          '-sandboxid', sandboxID
        ];
        if (debug)
          uploadArgs.push('-debug');
        const output = await runCommand('java', uploadArgs);
        const outputXML = output.toString();
        console.log(outputXML.indexOf('Uploaded'));
        count++;
      }
      else {
        core.info(`Uploading artifact ${file} to Policy Scan`);
        const uploadArgs = [
          '-jar', jarName,
          '-vid', vid,
          '-vkey', vkey,
          '-action', 'UploadFile',
          '-appid', appId,
          '-filepath', filepath + file,
        ];
        if (debug)
          uploadArgs.push('-debug');
        const output = await runCommand('java', uploadArgs);
        const outputXML = output.toString();
        console.log(outputXML.indexOf('Uploaded'));
        count++;
      }
    };
  }

  return count;
}

async function beginPreScan(vid, vkey, jarName, appId, autoScan, sandboxID, debug) {
  if (debug)
    core.debug(`Module: scan-service, function: beginPreScan. Action:BeginPrescan Application: ${appId}`);
  let commandArguments = [
    '-jar', jarName,
    '-vid', vid,
    '-vkey', vkey,
    '-action', 'BeginPrescan',
    '-appid', appId,
    '-autoscan', autoScan,
  ];
  if (sandboxID > 1) {
    commandArguments.push('-sandboxid', sandboxID);
  }
  if (debug)
    commandArguments.push('-debug'); 
  const output = await runCommand('java', commandArguments);
  const outputXML = output.toString();
  if (debug)
    core.debug(outputXML);
  return outputXML.indexOf('Pre-Scan Submitted') > -1;
}

async function checkPrescanSuccess(vid, vkey, jarName, appId, sandboxID) {
  let commandArguments = [
    '-jar', jarName,
    '-vid', vid,
    '-vkey', vkey,
    '-action', 'GetBuildInfo',
    '-appid', appId,
  ];
  if (sandboxID > 1) {
    commandArguments.push('-sandboxid', sandboxID);
  }
  const output = await runCommand('java', commandArguments);
  const outputXML = output.toString();
  return outputXML.indexOf('Pre-Scan Success') > -1;
}

async function getModules(vid, vkey, jarName, appId, include, sandboxID, debug) {
  if (debug)
    core.debug(`Module: scan-service, function: getModules. Action:GetPreScanResults Application: ${appId}`);
  let commandArguments = [
    '-jar', jarName,
    '-vid', vid,
    '-vkey', vkey,
    '-action', 'GetPreScanResults',
    '-appid', appId,
  ];
  if (sandboxID > 1) {
    commandArguments.push('-sandboxid', sandboxID);
  }
  if (debug)
    commandArguments.push('-debug'); 
  const output = await runCommand('java', commandArguments);
  const outputXML = output.toString();
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(outputXML);
  if (debug)
    core.debug(result);
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
  if (debug)
    core.debug(`Module: scan-service, function: getModules. modulesToScan: ${moduleIds}`);
  return moduleIds;
}

async function beginScan(vid, vkey, jarName, appId, moduleIds, sandboxID, debug) {
  if (debug)
    core.debug(`Module: scan-service, function: beginScan. Action:BeginScan Application: ${appId}`);
  let commandArguments = [
    '-jar', jarName,
    '-vid', vid,
    '-vkey', vkey,
    '-action', 'BeginScan',
    '-appid', appId,
    '-modules', moduleIds,
  ];
  if (debug)
    commandArguments.push('-debug');
  if (sandboxID > 1) {
    commandArguments.push('-sandboxid', sandboxID);
  }
  const output = await runCommand('java', commandArguments);
  const outputXML = output.toString();
  if (debug)
    core.debug(outputXML);
  return outputXML.indexOf('Submitted to Engine') > -1;
}

async function checkScanSuccess(vid, vkey, jarName, appId, buildId, sandboxID) {
  let commandArguments = [
    '-jar', jarName,
    '-vid', vid,
    '-vkey', vkey,
    '-action', 'GetBuildInfo',
    '-appid', appId,
  ];
  if (sandboxID > 1) {
    commandArguments.push('-sandboxid', sandboxID);
  }
  const output = await runCommand('java', commandArguments);
  const outputXML = output.toString();
  if (outputXML.indexOf('Results Ready') > -1) {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(outputXML);
    let passFail = 'Did Not Pass';
    result.buildinfo.build.forEach(build => {
      if (build.build_id === buildId) {
        if (build.$.policy_compliance_status === 'Calculating...') return { 'scanCompleted': false };
        passFail = build.$.policy_compliance_status;
      }
    });
    return { 'scanCompleted': true, 'passFail': passFail };
  }
  return { 'scanCompleted': false };
}

module.exports = {
  createBuild,
  createSandboxBuild,
  uploadFile,
  beginPreScan,
  checkPrescanSuccess,
  getModules,
  beginScan,
  checkScanSuccess
};

/***/ }),

/***/ 787:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(695);
const appConfig = __nccwpck_require__(936);
const { 
  getResourceByAttribute,
}= __nccwpck_require__(292);

async function getTeamsByName (vid, vkey, teamName,isDebug)  {
  const resource = {
    resourceUri: appConfig().teamsUri,
    queryAttribute: 'team_name',
    queryValue: encodeURIComponent(teamName)
  };
  const response = await getResourceByAttribute(vid, vkey, resource,isDebug);
  return response;
}

async function getVeracodeTeamsByName(vid, vkey, teams,isDebug) {
  core.debug(`Module: teams-service, function: getVeracodeTeamsByName. teams: ${teams}`);
  if (teams !== '') {
    const teamsName = teams.trim().split(',');
    let teamGuids = [];
    for (let index = 0; index < teamsName.length; index++) {
      const teamName = teamsName[index].trim();
      const responseData = await getTeamsByName(vid, vkey, teamName,isDebug);
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

/***/ 164:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(695);
const appConfig = __nccwpck_require__(936);
const { getVeracodeApplicationForPolicyScan, getVeracodeSandboxIDFromProfile, createSandboxRequest, getVeracodeApplicationScanStatus, getVeracodeApplicationFindings
} = __nccwpck_require__(907);
const { downloadJar, runCommand} = __nccwpck_require__(447);
const fs = __nccwpck_require__(896);
const util = __nccwpck_require__(23);
const { exec, execFileSync, execSync , spawn} = __nccwpck_require__(317);
const execPromise = util.promisify(exec);
const axios = __nccwpck_require__(932);

const { calculateAuthorizationHeader } = __nccwpck_require__(342);

const SCAN_TIME_OUT = 8;
const POLICY_EVALUATION_FAILED = 9;

async function executeStaticScans(vid, vkey, appname, policy, teams, createprofile, gitRepositoryUrl, sandboxname, version, filepath, responseCode, createsandbox, failbuild, debug) {
  core.info(`Getting Veracode Application for Policy Scan:: ${appname}`)
  const veracodeApp = await getVeracodeApplicationForPolicyScan(vid, vkey, appname, policy, teams, createprofile, gitRepositoryUrl, debug);
  if (veracodeApp.appId === -1) {
    core.setFailed(`Veracode application profile Not Found. Please create a profile on Veracode Platform, \
      or set "createprofile" to "true" in the pipeline configuration to automatically create profile.`);
    return;
  }
  core.info(`Veracode App Id:: ${veracodeApp.appId}`);
  core.info(`Veracode App Guid:: ${veracodeApp.appGuid}`);

  const jarName = await downloadJar();
  let sandboxID;
  let sandboxGUID;
  const buildId = version;

  const stat = util.promisify(fs.stat);
  const stats = await stat(filepath);

  if (stats.isFile()) {
    console.log(`${filepath} is a file.`);
  } else if (stats.isDirectory()) {
    console.log(`${filepath} is a directory.`);
  }

  try {
    if (sandboxname !== '') {
      core.info(`Running a Sandbox Scan: '${sandboxname}' on applicaiton: '${appname}'`);
      const sandboxes = await getVeracodeSandboxIDFromProfile(vid, vkey, veracodeApp.appGuid, debug);

      core.info('Finding Sandbox ID & GUID');
      if (sandboxes.page.total_elements !== 0) {
        for (let i = 0; i < sandboxes._embedded.sandboxes.length; i++) {
          if (sandboxes._embedded.sandboxes[i].name.toLowerCase() === sandboxname.toLowerCase()) {
            sandboxID = sandboxes._embedded.sandboxes[i].id;
            sandboxGUID = sandboxes._embedded.sandboxes[i].guid
          }
          else {
            core.info(`Not the sandbox (${sandboxes._embedded.sandboxes[i].name}) we are looking for (${sandboxname})`);
          }
        }
      }
      if (sandboxID == undefined && createsandbox == 'true') {
        if (debug)
          core.debug(`Sandbox Not Found. Creating Sandbox: ${sandboxname}`);
        //create sandbox
        const createSandboxResponse = await createSandboxRequest(vid, vkey, veracodeApp.appGuid, sandboxname, debug);
        core.info(`Veracode Sandbox Created: ${createSandboxResponse.name} / ${createSandboxResponse.guid}`);
        sandboxID = createSandboxResponse.id;
        sandboxGUID = createSandboxResponse.guid;

        await executeSandboxScan(vid, vkey, veracodeApp, jarName, version, filepath, responseCode, sandboxID, sandboxGUID, sandboxname, debug)
        core.info(`Veracode Sandbox Scan Created, Build Id: ${version}`);
        core.info('Static Scan Submitted, please check Veracode Platform for results');
        return;
      }
      else if (sandboxID == undefined && createsandbox == 'false') {
        core.setFailed(`Sandbox Not Found. Please create a sandbox on Veracode Platform, \
            or set "createsandbox" to "true" in the pipeline configuration to automatically create sandbox.`);
        return;
      }
      else {
        core.info(`Sandbox Found: ${sandboxID} - ${sandboxGUID}`);
        await executeSandboxScan(vid, vkey, veracodeApp, jarName, version, filepath, responseCode, sandboxID, sandboxGUID, sandboxname, debug)
        core.info(`Veracode Sandbox Scan Created, Build Id: ${version}`);
        core.info("Static Scan Submitted, please check Veracode Platform for results");
        return;
      }
    }
    else {
      core.info(`Running a Policy Scan: ${appname}`);
      //comand for policy scan 
      core.info(`Veracode Policy Scan Created, Build Id: ${version}`);
      await executePolicyScan(vid, vkey, veracodeApp, jarName, version, filepath, responseCode, failbuild, debug)
    }
  } catch (error) {
    console.log(error)
    core.setFailed('Failed to create Veracode Scan. App not in state where new builds are allowed.');
    return;
  }

}

async function executePolicyScan(vid, vkey, veracodeApp, jarName, version, filepath, responseCode, failbuild, debug) {
  const debugFlag = debug ? ' -debug' : '';
  if (debug)
    core.debug(`Module: workflow-service, function: executePolicyScan. Application: ${veracodeApp.appId}`);
  const policyScanCommand = `java -jar ${jarName} -action UploadAndScanByAppId -vid ${vid} -vkey ${vkey} -appid ${veracodeApp.appId} -filepath ${filepath} -version ${version} -scanpollinginterval 30 -autoscan true -scanallnonfataltoplevelmodules true -includenewmodules true -scantimeout 6000 -deleteincompletescan 2${debugFlag}`;
  let scan_id = "";
  let sandboxID;
  let sandboxGUID;
  let stdout;
  let stderr;
  try {
    core.info(`Command to execute the policy scan : ${policyScanCommand}`);
    stdout = execSync(policyScanCommand, { encoding: "utf-8" });
  } catch (error) {
    stdout = error.stdout?.toString();
    stderr = error.stderr?.toString();
  }

  if (debug) {
    core.debug(stdout);
    core.debug(stderr);
  }
  if (stdout) {
    scan_id = extractValue(
        stdout,
        'The analysis id of the new analysis is "',
        '"'
    );
    core.info("Waiting for Scan Results...");
    const output1 = await checkPolicyScanStatus(
        vid,
        vkey,
        veracodeApp,
        scan_id,
        failbuild
    );

    if (debug)
      core.debug(`scan status: :${output1}`);
  } else {
    core.info("No information from Policy scan could be captured!");
  }

  await getVeracodeApplicationFindings(
      vid,
      vkey,
      veracodeApp,
      version,
      sandboxID,
      sandboxGUID
  );
  return responseCode;
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

 function extractValue(source,prefix, terminator){
    let start = source.search(prefix);
    let sub1 = source.substring(start + prefix.length);
    let end = sub1.search(terminator);
    return sub1.substring(0, end);
}
async function getPolicyScanStatus(veracodeApiId, veracodeApiSecret, appGuid, buildId) {
  let resource = {
      resourceUri: `${appConfig().applicationUri}/${appGuid}`,
      queryAttribute: '',
      queryValue: ''
  };
  const response = await getResourceByAttribute(veracodeApiId, veracodeApiSecret, resource);
  const scans = response.scans;
  for (let i = 0; i < scans.length; i++) {
      const scanUrl = scans[i].scan_url;
      const scanId = scanUrl.split(':')[3];
      if (scanId === buildId) {
          console.log(`Scan Status of buildId ${buildId} is : ${scans[i].status}`);
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

async function checkPolicyScanStatus(
  vid,
  vkey,
  veracodeApp,
  scan_id,
  failbuild
) {
  let endTime = new Date(
    new Date().getTime() + appConfig().scanStatusApiTimeout
  );
  let responseCode = 0;
  let moduleSelectionCount = 0;
  let moduleSelectionStartTime = new Date();
  while (true) {
    await sleep(appConfig().pollingInterval);
    core.info("Checking Scan Results...");
    const statusUpdate = await getPolicyScanStatus(
      vid,
      vkey,
      veracodeApp.appGuid,
      scan_id
    );
    core.info(`Scan Status: ${JSON.stringify(statusUpdate)}`);
    if (
      statusUpdate.status === "MODULE_SELECTION_REQUIRED" ||
      statusUpdate.status === "PRE-SCAN_SUCCESS"
    ) {
      moduleSelectionCount++;
      if (moduleSelectionCount === 1) moduleSelectionStartTime = new Date();
      if (
        new Date() - moduleSelectionStartTime >
        appConfig().moduleSelectionTimeout
      ) {
        core.setFailed(
          "Veracode Policy Scan Exited: Module Selection Timeout Exceeded. " +
            "Please review the scan on Veracode Platform." +
            `https://analysiscenter.veracode.com/auth/index.jsp#HomeAppProfile:${veracodeApp.oid}:${veracodeApp.appId}`
        );
        responseCode = SCAN_TIME_OUT;
        return responseCode;
      }
    }
    if (
      (statusUpdate.status === "PUBLISHED" ||
        statusUpdate.status == "RESULTS_READY") &&
      statusUpdate.scanUpdateDate
    ) {
      const scanDate = new Date(statusUpdate.scanUpdateDate);
      const policyScanDate = new Date(statusUpdate.lastPolicyScanData);
      if (!policyScanDate || scanDate < policyScanDate) {
        if (
          (statusUpdate.passFail === "DID_NOT_PASS" ||
            statusUpdate.passFail == "CONDITIONAL_PASS") &&
          failbuild.toLowerCase() === "true"
        ) {
          core.setFailed("Policy Violation: Veracode Policy Scan Failed");
          responseCode = POLICY_EVALUATION_FAILED;
        } else core.info(`Policy Evaluation: ${statusUpdate.passFail}`);
        break;
      } else {
        core.info(`Policy Evaluation: ${statusUpdate.passFail}`);
      }
    }

    if (endTime < new Date()) {
      core.setFailed(`Veracode Policy Scan Exited: Scan Timeout Exceeded`);
      responseCode = SCAN_TIME_OUT;
      return responseCode;
    }
  }

  return responseCode;
}


async function getResourceByAttribute(veracodeApiId, veracodeApiSecret, resource){
  const resourceUri = resource.resourceUri;
  const queryAttribute = resource.queryAttribute1;
  const queryValue = resource.queryValue1;
  const queryAttribute2 = resource.queryAttribute2;
  const queryValue2 = resource.queryValue2;
  var urlQueryParams = queryAttribute !== '' ? `?${queryAttribute}=${queryValue}` : '';
  if (queryAttribute2) {
      urlQueryParams = urlQueryParams + `&${queryAttribute2}=${queryValue2}`;
  }
  let host = appConfig().us;
  if (veracodeApiId.startsWith('vera01ei-')) {
      host = appConfig().eu;
      veracodeApiId = veracodeApiId.split('-')[1] || '';
      veracodeApiSecret = veracodeApiSecret.split('-')[1] || '';
  }
  const headers = {
      'Authorization': calculateAuthorizationHeader(veracodeApiId, veracodeApiSecret, host, resourceUri, urlQueryParams, 'GET')
  };
  const appUrl = `https://${host}${resourceUri}${urlQueryParams}`;
  try {
      const response = await axios.get(appUrl, { headers });
      return response.data;
  } catch (error) {
      console.log(`error while calling api with resource : ${JSON.stringify(resource)}: ${error}`);
  }
}

async function executeSandboxScan(vid, vkey, veracodeApp, jarName, version, filepath, responseCode, sandboxID, sandboxGUID, sandboxname, debug) {
  const createSandboxCommand = 'java' ;
  const createSandboxArgumnets = [
         '-jar', `${jarName}`,
         '-action', 'UploadAndScanByAppId',
         '-vid', `${vid}`,
         '-vkey', `${vkey}`,
         '-appid', `${veracodeApp.appId}`,
         '-filepath', `${filepath}`, 
         '-version', `${version}`, 
         '-scanpollinginterval', '30', 
         '-autoscan', 'true',
         '-createsandbox', 'true',
         '-sandboxname', `${sandboxname}`,
         '-scanallnonfataltoplevelmodules', 'true', 
         '-includenewmodules', 'true', 
         '-deleteincompletescan', '2'
        ];
  if (debug) {
    createSandboxArgumnets.push('-debug');
    core.debug(`Module: workflow-service, function: executeSandboxScan. Action:UploadAndScanByAppId. Application: ${veracodeApp.appId}`);
  }
  const output = await runCommand(createSandboxCommand,createSandboxArgumnets);
  const outputXML = output.toString();
  if (debug)
    core.debug(outputXML);
  return;
}
 
module.exports = {executeStaticScans};

/***/ }),

/***/ 855:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const appConfig = __nccwpck_require__(936)

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

/***/ }),

/***/ 728:
/***/ ((module) => {

module.exports = eval("require")("@actions/artifact");


/***/ }),

/***/ 10:
/***/ ((module) => {

module.exports = eval("require")("@actions/artifact-v1");


/***/ }),

/***/ 695:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 932:
/***/ ((module) => {

module.exports = eval("require")("axios");


/***/ }),

/***/ 726:
/***/ ((module) => {

module.exports = eval("require")("minimatch");


/***/ }),

/***/ 640:
/***/ ((module) => {

module.exports = eval("require")("sjcl");


/***/ }),

/***/ 662:
/***/ ((module) => {

module.exports = eval("require")("undici");


/***/ }),

/***/ 736:
/***/ ((module) => {

module.exports = eval("require")("xml2js");


/***/ }),

/***/ 317:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 982:
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ 896:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 943:
/***/ ((module) => {

"use strict";
module.exports = require("fs/promises");

/***/ }),

/***/ 23:
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
const core = __nccwpck_require__(695);
const { getVeracodeApplicationForPolicyScan, getVeracodeSandboxIDFromProfile, createSandboxRequest, getVeracodeApplicationScanStatus, getVeracodeApplicationFindings
} = __nccwpck_require__(907);
const { downloadJar } = __nccwpck_require__(447);
const { createSandboxBuild, createBuild, uploadFile, beginPreScan, checkPrescanSuccess, getModules, beginScan, checkScanSuccess
} = __nccwpck_require__(32);
const appConfig = __nccwpck_require__(936);
const { setGlobalProxy } = __nccwpck_require__(292);
const { executeStaticScans } = __nccwpck_require__(164);

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
const createsandbox = core.getInput('createsandbox', { required: false });
const sandboxname = core.getInput('sandboxname', { required: false });
const gitRepositoryUrl = core.getInput('gitRepositoryUrl', { required: false });
const platformType = core.getInput('platformType', { required: false });
const workflowApp = core.getInput('workflowApp', {required: false});
const debug = core.getInput('debug', {required: false});

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

  // set global proxy for API calls if proxy attributes are found
  const isDebug = (debug && debug==1);

  if (isDebug){
    core.info(`process.env.http_proxy - ${process.env.http_proxy }`);
    core.info(`process.env.HTTP_PROXY - ${process.env.HTTP_PROXY }`);
    core.info(`process.env.https_proxy - ${process.env.https_proxy }`);
    core.info(`process.env.HTTPS_PROXY - ${process.env.HTTPS_PROXY }`);
  }

  // Setting up a global proxy for the API calls
  setGlobalProxy(isDebug);

  if (workflowApp && workflowApp.toLowerCase() === 'true') {
      await executeStaticScans(vid, vkey, appname, policy, teams, createprofile, gitRepositoryUrl, sandboxname, version, filepath, responseCode, createsandbox, failbuild, debug);
      return;
  }  

  if (debug)
    core.debug(`Getting Veracode Application for Policy Scan: ${appname}`)
  const veracodeApp = await getVeracodeApplicationForPolicyScan(vid, vkey, appname, policy, teams, createprofile, gitRepositoryUrl, debug);
  if (veracodeApp.appId === -1) {
    core.setFailed(`Veracode application profile Not Found. Please create a profile on Veracode Platform, \
      or set "createprofile" to "true" in the pipeline configuration to automatically create profile.`);
    return;
  }
  core.info(`Veracode App Id: ${veracodeApp.appId}`);
  core.info(`Veracode App Guid: ${veracodeApp.appGuid}`);

  const jarName = await downloadJar();

  let buildId;
  let sandboxID;
  let sandboxGUID;
  const mylaunchDate = new Date();
  try {
    if (sandboxname !== ''){
      core.info(`Running a Sandbox Scan: '${sandboxname}' on applicaiton: '${appname}'`);
      const sandboxes = await getVeracodeSandboxIDFromProfile(vid, vkey, veracodeApp.appGuid, debug);

      core.info('Finding Sandbox ID & GUID');
      if (sandboxes.page.total_elements !== 0) {
        for (let i = 0; i < sandboxes._embedded.sandboxes.length; i++){
          if (sandboxes._embedded.sandboxes[i].name.toLowerCase() === sandboxname.toLowerCase()){
            sandboxID = sandboxes._embedded.sandboxes[i].id;
            sandboxGUID = sandboxes._embedded.sandboxes[i].guid
          }
          else {
            core.info(`Not the sandbox (${sandboxes._embedded.sandboxes[i].name}) we are looking for (${sandboxname})`);
          }
        }
      }
      if ( sandboxID == undefined && createsandbox == 'true'){
        if (debug)
          core.debug(`Sandbox Not Found. Creating Sandbox: ${sandboxname}`);
        //create sandbox
        const createSandboxResponse = await createSandboxRequest(vid, vkey, veracodeApp.appGuid, sandboxname, debug);
        core.info(`Veracode Sandbox Created: ${createSandboxResponse.name} / ${createSandboxResponse.guid}`);
        sandboxID = createSandboxResponse.id;
        sandboxGUID = createSandboxResponse.guid;
        buildId = await createSandboxBuild(vid, vkey, jarName, veracodeApp.appId, version, deleteincompletescan, sandboxID, debug);
        core.info(`Veracode Sandbox Scan Created, Build Id: ${buildId}`);
      }
      else if ( sandboxID == undefined && createsandbox == 'false'){
        core.setFailed(`Sandbox Not Found. Please create a sandbox on Veracode Platform, \
        or set "createsandbox" to "true" in the pipeline configuration to automatically create sandbox.`);
        return;
      }
      else{
        core.info(`Sandbox Found: ${sandboxID} - ${sandboxGUID}`);
        buildId = await createSandboxBuild(vid, vkey, jarName, veracodeApp.appId, version, deleteincompletescan, sandboxID, debug);
        core.info(`Veracode Sandbox Scan Created, Build Id: ${buildId}`);
      }
    }
    else{
      core.info(`Running a Policy Scan: ${appname}`);
      buildId = await createBuild(vid, vkey, jarName, veracodeApp.appId, version, deleteincompletescan, debug);
      core.info(`Veracode Policy Scan Created, Build Id: ${buildId}`);
    }
  } catch (error) {
    core.setFailed('Failed to create Veracode Scan. App not in state where new builds are allowed.');
    return;
  }

  const uploaded = await uploadFile(vid, vkey, jarName, veracodeApp.appId, filepath, sandboxID, debug);
  core.info(`Artifact(s) uploaded: ${uploaded}`);

  // return and exit the app if the duration of the run is more than scantimeout
  let endTime = new Date();
  if (scantimeout !== '') {
    const startTime = new Date();
    endTime = new Date(startTime.getTime() + scantimeout * 1000 * 60);
  }

  core.info(`scantimeout: ${scantimeout}`);
  core.info(`include: ${include}`)
  
  if (include === '' && uploaded > 0) {
    const autoScan = true;
    await beginPreScan(vid, vkey, jarName, veracodeApp.appId, autoScan, sandboxID, debug);
    if (scantimeout === '') {
      core.info('Static Scan Submitted, please check Veracode Platform for results');
      return;
    }
  } 
  else if (uploaded > 0)
  {
    const autoScan = false;
    const prescan = await beginPreScan(vid, vkey, jarName, veracodeApp.appId, autoScan, sandboxID, debug);
    core.info(`Pre-Scan Submitted: ${prescan}`);
    while (true) {
      await sleep(appConfig().pollingInterval);
      core.info('Checking for Pre-Scan Results...');
      if (await checkPrescanSuccess(vid, vkey, jarName, veracodeApp.appId, sandboxID)) {
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

    const moduleIds = await getModules(vid, vkey, jarName, veracodeApp.appId, include, sandboxID, debug);
    core.info(`Modules to Scan: ${moduleIds.toString()}`);
    const scan = await beginScan(vid, vkey, jarName, veracodeApp.appId, moduleIds.toString(), sandboxID, debug);
    core.info(`Scan Submitted: ${scan}`);
  }
  else 
  {
    console.log('No artifacts to upload');
  }

  core.info('Waiting for Scan Results...');
  let moduleSelectionStartTime = new Date();
  let moduleSelectionCount = 0;
  while (true) {
    await sleep(appConfig().pollingInterval);
    core.info('Checking Scan Results...');
    const statusUpdate = await getVeracodeApplicationScanStatus(vid, vkey, veracodeApp, buildId, sandboxID, sandboxGUID, jarName, mylaunchDate,isDebug);
    core.info(`Scan Status: ${JSON.stringify(statusUpdate)}`);
    if (statusUpdate.status === 'MODULE_SELECTION_REQUIRED' || statusUpdate.status === 'PRE-SCAN_SUCCESS') {
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
    if ((statusUpdate.status === 'PUBLISHED' || statusUpdate.status == 'RESULTS_READY') && statusUpdate.scanUpdateDate) {
      const scanDate = new Date(statusUpdate.scanUpdateDate);
      const policyScanDate = new Date(statusUpdate.lastPolicyScanData);
      if (!policyScanDate || scanDate < policyScanDate) {
        if ((statusUpdate.passFail === 'DID_NOT_PASS' || statusUpdate.passFail == 'CONDITIONAL_PASS') && failbuild.toLowerCase() === 'true'){
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

  await getVeracodeApplicationFindings(vid, vkey, veracodeApp, buildId, sandboxID, sandboxGUID, platformType, isDebug);
  return responseCode;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

run();
module.exports = __webpack_exports__;
/******/ })()
;