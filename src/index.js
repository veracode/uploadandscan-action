const core = require('@actions/core');
const { getVeracodeApplicationForPolicyScan, getVeracodeSandboxIDFromProfile, createSandbox, getVeracodeApplicationScanStatus, getVeracodeApplicationFindings
} = require('./services/application-service.js');
const { downloadJar } = require('./api/java-wrapper.js');
const { createSandboxBuild, createBuild, uploadFile, beginPreScan, checkPrescanSuccess, getModules, beginScan, checkScanSuccess
} = require('./services/scan-service.js');
const appConfig = require('./app-cofig.js');

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
    if (createsandbox === 'true'){
      core.info(`Running a Sandbox Scan: ${sandboxname} on applicaiton: ${appname}`);
      const sandboxes = await getVeracodeSandboxIDFromProfile(vid, vkey, appname);

      let sandboxID = {sandboxID: -1};
      for (let i = 0; i < sandboxes._embedded.sandboxes.length; i++){
        if (sandboxes._embedded.sandboxes[i].name === sandboxname){
          sandboxID = {sandboxID: sandboxes._embedded.sandboxes[i].id};
          core.info(`Sandbox Found: ${JSON.stringify(sandboxID)}`);
        }
      }
      if ( sandboxID === -1 && createsandbox === 'true'){
        core.debug(`Sandbox Not Found. Creating Sandbox: ${sandboxname}`);
        //create sandbox
        const createSandbox = await createSandbox(vid, vkey, veracodeApp.appId, sandboxname);
        core.info(`Veracode Sandbox Created: ${createSandbox}`);
        sandboxID = createSandbox.sandboxID;
      }
      else if (sandboxID === -1 && createsandbox === 'false'){
        core.setFailed(`Sandbox Not Found. Please create a sandbox on Veracode Platform, \
        or set "createsandbox" to "true" in the pipeline configuration to automatically create sandbox.`);
        return;
      }
      else{
        core.info(`Sandbox Found: ${sandboxID}`);
        buildId = await createSandboxBuild(vid, vkey, jarName, veracodeApp.appId, version, deleteincompletescan, createsandbox, sandboxname);
        core.info(`Veracode Sandbox Scan Created, Build Id: ${buildId}`);
      }
    }
    else{
      core.info(`Running a Policy Scan: ${appname}`);
      buildId = await createBuild(vid, vkey, jarName, veracodeApp.appId, version, deleteincompletescan);  
      core.info(`Veracode Policy Scan Created, Build Id: ${buildId}`);
    }
  } catch (error) {
    core.setFailed('Failed to create Veracode Scan. App not in state where new builds are allowed.');
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