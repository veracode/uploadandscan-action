const { runCommand } = require('../api/java-wrapper.js');
const xml2js = require('xml2js');
const { minimatch } = require('minimatch')

async function createBuild(vid, vkey, jarName, appId, version) {
  const command = `java -jar ${jarName} -vid ${vid} -vkey ${vkey} -action CreateBuild -appid ${appId} -version ${version}`
  const output = await runCommand(command);
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