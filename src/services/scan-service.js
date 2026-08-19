const { runCommand } = require('../api/java-wrapper.js');
const xml2js = require('xml2js');
const { minimatch } = require('minimatch');
const core = require('@actions/core');
const fs = require('fs');
const util = require('util');

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
          '-filepath', filepath + file,
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
  const outputStr = output.toString();
  const xmlStart = outputStr.indexOf('<?xml');
  const cleanXML = xmlStart > -1 ? outputStr.substring(xmlStart) : outputStr;
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(cleanXML);
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