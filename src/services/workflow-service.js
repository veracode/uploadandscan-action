const core = require('@actions/core');
const appConfig = require('../app-cofig.js');
const { getVeracodeApplicationForPolicyScan, getVeracodeSandboxIDFromProfile, createSandboxRequest, getVeracodeApplicationScanStatus, getVeracodeApplicationFindings
} = require('./application-service.js');
const { downloadJar, runCommand} = require('../api/java-wrapper.js');
const fs = require('fs');
const util = require('util');
const { exec, execFileSync, execSync , spawn} = require('child_process');
const execPromise = util.promisify(exec);
const axios = require('axios');
const { safeJavaExec } = require('../utils/safe-exec.js')

const { calculateAuthorizationHeader } = require('../api/veracode-hmac.js');

const SCAN_TIME_OUT = 8;
const POLICY_EVALUATION_FAILED = 9;

async function executeStaticScans(vid, vkey, appname, policy, teams, createprofile, gitRepositoryUrl, sandboxname, version, filepath, responseCode, createsandbox, failbuild, debug) {
  core.info(`Getting Veracode Application for Policy Scan: ${appname}`)
  const veracodeApp = await getVeracodeApplicationForPolicyScan(vid, vkey, appname, policy, teams, createprofile, gitRepositoryUrl, debug);
  if (veracodeApp.appId === -1) {
    core.setFailed(`Veracode application profile Not Found. Please create a profile on Veracode Platform, \
      or set "createprofile" to "true" in the pipeline configuration to automatically create profile.`);
    return;
  }
  core.info(`Veracode App Id: ${veracodeApp.appId}`);
  core.info(`Veracode App Guid: ${veracodeApp.appGuid}`);

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

  const artifact = await fs.promises.readdir(filepath);

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
    stdout = safeJavaExec(jarName, "UploadAndScanByAppId", {
      vid:                          vid,
      vkey:                         vkey,
      appid:                        veracodeApp.appId,
      filepath:                     filepath,
      version:                      version,
      scanpollinginterval:          "30",
      autoscan:                     "true",
      scanallnonfataltoplevelmodules: "true",
      includenewmodules:            "true",
      scantimeout:                  "6000",
      deleteincompletescan:         "2",
      ...(debugFlag ? { debug: "true" } : {}),
    });
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