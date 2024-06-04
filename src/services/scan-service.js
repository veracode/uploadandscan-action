const { runCommand } = require('../api/java-wrapper.js');
const xml2js = require('xml2js');
const { minimatch } = require('minimatch')
const core = require('@actions/core');
const fs = require('fs');
const util = require('util');

async function createBuild(vid, vkey, jarName, appId, version, deleteincompletescan) {
  const createBuildCommand = 'java';
  const createBuildArguments = [
    '-jar', jarName,
    '-vid', vid,
    '-vkey', vkey,
    '-action', 'CreateBuild',
    '-appid', appId, 
    '-version', version,
  ];
  const output = await runCommand(createBuildCommand, createBuildArguments);
  if (output === 'failed' && deleteincompletescan === 'false'){
    throw new Error(`Error creating build: ${output}`);
  }
  else if (output === 'failed' && deleteincompletescan === 'true'){
    const deleteOutput = await runCommand(
      'java',
      [
        '-jar', jarName,
        '-vid', vid,
        '-vkey', vkey,
        '-action', 'DeleteBuild',
        '-appid', appId,
        '-version', version
      ]
    );
    if (deleteOutput === 'failed'){
      throw new Error(`Error deleting build: ${deleteOutput}`);
    }
    else {
      output = await runCommand(command);
      if (output === 'failed'){
        throw new Error(`Error creating build: ${createOutput}`);
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

async function createSandboxBuild(vid, vkey, jarName, appId, version, deleteincompletescan, sandboxID) {
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
  const output = await runCommand(createBuildCommand, createBuildArguments);
  if (output === 'failed' && deleteincompletescan === 'false'){
    throw new Error(`Error creating build: ${output}`);
  }
  else if (output === 'failed' && deleteincompletescan === 'true'){
    const deleteOutput = await runCommand(
      'java',
      [
        '-jar', jarName,
        '-vid', vid,
        '-vkey',vkey,
        '-action', 'DeleteBuild',
        '-sandboxid', sandboxID,
        '-appid', appId,
      ]
    );
    if (deleteOutput === 'failed'){
      throw new Error(`Error deleting build: ${deleteOutput}`);
    }
    else {
      output = await runCommand(createBuildCommand, createBuildArguments);
      if (output === 'failed'){
        throw new Error(`Error creating build: ${createOutput}`);
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


async function uploadFile(vid, vkey, jarName, appId, filepath, sandboxID) {
  let count = 0;

  const stat = util.promisify(fs.stat);
  const stats = await stat(filepath);

  if (stats.isFile()) {
      console.log(`${filepath} is a file.`);
      if ( sandboxID > 1){
        core.info(`Uploading artifact (${filepath}) to Sandbox: ${sandboxID}`);
        const output = await runCommand(
          'java',
          [
            '-jar', jarName,
            '-vid', vid,
            '-vkey', vkey,
            '-action', 'UploadFile',
            '-appid', appId,
            '-filepath', filepath,
            '-sandboxid', sandboxID,
          ]
        );
        const outputXML = output.toString();
        console.log(outputXML.indexOf('Uploaded'))
        count++
      }
      else{
        core.info(`Uploading artifact (${filepath}) to Policy Scan`);
        const output = await runCommand(
          'java', 
          [
            '-jar', jarName,
            '-vid', vid,
            '-vkey', vkey,
            '-action', 'UploadFile', 
            '-appid', appId,
            '-filepath', filepath,
          ]
        );
        const outputXML = output.toString();
        console.log(outputXML.indexOf('Uploaded'))
        count++
      }
  } 
  else if (stats.isDirectory()) {
      console.log(`${filepath} is a directory.`);

      const filesPromis = util.promisify(fs.readdir);
      const files = await filesPromis(filepath);
      for (const file of files) {
        if ( sandboxID > 1){
          core.info(`Uploading artifact ${file} to Sandbox: ${sandboxID}`);
          const output = await runCommand(
            'java',
            [
              '-jar', jarName,
              '-vid', vid,
              '-vkey', vkey,
              '-action', 'UploadFile',
              '-appid', appId,
              '-filepath', filepath + file,
              '-sandboxid', sandboxID,
            ]
          );
          const outputXML = output.toString();
          console.log(outputXML.indexOf('Uploaded'))
          count++
        }
        else{
          core.info(`Uploading artifact ${file} to Policy Scan`);
          const output = await runCommand(
            'java',
            [
              '-jar', jarName,
              '-vid', vid,
              '-vkey', vkey,
              '-action', 'UploadFile',
              '-appid', appId,
              '-filepath', filepath + file,
            ]
          );
          const outputXML = output.toString();
          console.log(outputXML.indexOf('Uploaded'))
          count++
        }
      };
  }

  return count;
}

async function beginPreScan(vid, vkey, jarName, appId, autoScan, sandboxID) {
  let commandArguments = [
    '-jar', jarName, 
    '-vid', vid,
    '-vkey', vkey,
    '-action', 'BeginPrescan',
    '-appid', appId,
    '-autoscan', autoScan,
  ];
  if ( sandboxID > 1){
    commandArguments.push('-sandboxid', sandboxID);
  }
  const output = await runCommand('java', commandArguments);
  const outputXML = output.toString();
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
  if ( sandboxID > 1){
    commandArguments.push('-sandboxid', sandboxID);
  }
  const output = await runCommand('java', commandArguments);
  const outputXML = output.toString();
  return outputXML.indexOf('Pre-Scan Success') > -1;
}

async function getModules(vid, vkey, jarName, appId, include, sandboxID) {
  let commandArguments = [
    '-jar', jarName, 
    '-vid', vid,
    '-vkey', vkey,
    '-action', 'GetPreScanResults',
    '-appid', appId,
  ];
  if ( sandboxID > 1){
    commandArguments.push('-sandboxid', sandboxID);
  }
  const output = await runCommand('java', commandArguments);
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

async function beginScan(vid, vkey, jarName, appId, moduleIds, sandboxID) {
  let commandArguments = [
    '-jar', jarName, 
    '-vid', vid,
    '-vkey', vkey,
    '-action', 'BeginScan',
    '-appid', appId,
    '-modules', moduleIds,
  ];
  if ( sandboxID > 1){
    commandArguments.push('-sandboxid', sandboxID);
  }
  const output = await runCommand('java', commandArguments);
  const outputXML = output.toString();
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
  if ( sandboxID > 1){
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
  createSandboxBuild,
  uploadFile,
  beginPreScan,
  checkPrescanSuccess,
  getModules,
  beginScan,
  checkScanSuccess
}