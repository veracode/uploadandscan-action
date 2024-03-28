const { runCommand } = require('../api/java-wrapper.js');
const xml2js = require('xml2js');
const { minimatch } = require('minimatch')
const core = require('@actions/core');
const fs = require('fs');

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

async function createSandboxBuild(vid, vkey, jarName, appId, version, deleteincompletescan, sandboxID) {
  const command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action CreateBuild -sandboxid ${sandboxID} -appid ${appId} -version ${version}`
  var output = await runCommand(command);
  if (output === 'failed' && deleteincompletescan === 'false'){
    throw new Error(`Error creating build: ${output}`);
  }
  else if (output === 'failed' && deleteincompletescan === 'true'){
    const deleteCommand = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action DeleteBuild -sandboxid ${sandboxID} -appid ${appId}`
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

async function uploadFile(vid, vkey, jarName, appId, filepath, sandboxID) {
  let command;

  fs.stat(filepath, (err, stats) => {
    if (err) {
        console.error(`Error reading path: ${err}`);
    } else {
        if (stats.isFile()) {
            console.log(`${filepath} is a file.`);
            if ( sandboxID > 1){
              core.info(`Uploading artifact(s) to Sandbox: ${sandboxID}`);
              command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action UploadFile -appid ${appId} -filepath ${filepath} -sandboxid ${sandboxID}`
            }
            else{
              core.info(`Uploading artifact(s) to Policy Scan`);
              command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action UploadFile -appid ${appId} -filepath ${filepath}`
            }
        } 
        else if (stats.isDirectory()) {
            console.log(`${filepath} is a directory.`);
            fs.readdir(filepath, (err, files) => {
              if (err) {
                  console.error(`Error reading directory: ${err}`);
              } else {
                  files.forEach(file => {
                    if ( sandboxID > 1){
                      core.info(`Uploading artifact(s) to Sandbox: ${sandboxID}`);
                      command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action UploadFile -appid ${appId} -filepath ${file} -sandboxid ${sandboxID}`
                    }
                    else{
                      core.info(`Uploading artifact(s) to Policy Scan`);
                      command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action UploadFile -appid ${appId} -filepath ${file}`
                    }
                  });
              }
            });
        }
    }
  });




  
  const output = await runCommand(command);
  const outputXML = output.toString();
  return outputXML.indexOf('Uploaded') > -1;
}

async function beginPreScan(vid, vkey, jarName, appId, autoScan, sandboxID) {
  let command;
  if ( sandboxID > 1){
    command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action BeginPrescan -appid ${appId} -autoscan ${autoScan} -sandboxid ${sandboxID}`
  }
  else{
    command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action BeginPrescan -appid ${appId} -autoscan ${autoScan}`
  }
  const output = await runCommand(command);
  const outputXML = output.toString();
  return outputXML.indexOf('Pre-Scan Submitted') > -1;
}

async function checkPrescanSuccess(vid, vkey, jarName, appId, sandboxID) {
  let command
  if ( sandboxID > 1){
    command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action GetBuildInfo -appid ${appId} -sandboxid ${sandboxID}`
  }
  else{
    command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action GetBuildInfo -appid ${appId}`
  }
  const output = await runCommand(command);
  const outputXML = output.toString();
  return outputXML.indexOf('Pre-Scan Success') > -1;
}

async function getModules(vid, vkey, jarName, appId, include, sandboxID) {
  let command;
  if ( sandboxID > 1){
    command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action GetPreScanResults -appid ${appId} -sandboxid ${sandboxID}`
  }
  else{
    command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action GetPreScanResults -appid ${appId}`
  }
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

async function beginScan(vid, vkey, jarName, appId, moduleIds, sandboxID) {
  let command;
  if ( sandboxID > 1){
    command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action BeginScan -appid ${appId} -modules ${moduleIds} -sandboxid ${sandboxID}`
  }
  else {
    command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action BeginScan -appid ${appId} -modules ${moduleIds}`
  }
  const output = await runCommand(command);
  const outputXML = output.toString();
  return outputXML.indexOf('Submitted to Engine') > -1;
}

async function checkScanSuccess(vid, vkey, jarName, appId, buildId, sandboxID) {
  let command;
  if ( sandboxID > 1){
    command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action GetBuildInfo -appid ${appId} -sandboxid ${sandboxID}`
  }
  else{
    command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action GetBuildInfo -appid ${appId}`
  }
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
  createSandboxBuild,
  uploadFile,
  beginPreScan,
  checkPrescanSuccess,
  getModules,
  beginScan,
  checkScanSuccess
}