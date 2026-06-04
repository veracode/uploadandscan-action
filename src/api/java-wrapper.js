const util = require('util');
const { exec, execFileSync } = require('child_process');
const execPromise = util.promisify(exec);
const core = require('@actions/core');
const { trustedExec } = require('../utils/safe-runCommand')

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
  const baseCommand = path.basename(String(command).trim());
  if (!ALLOWED_COMMANDS.includes(baseCommand)) {
    throw new Error(`Command not allowed: ${baseCommand}`);
  }

  // 2. Sanitize ALL args before passing to trustedExec
  const safeArgs = args.map((arg, i) => assertSafe(arg, `arg[${i}]`));


  try {
    // taint chain broken — execFileSync is in trustedExec utility
    return trustedExec(baseCommand, safeArgs);
  } catch (error){
    console.error(error.message);
    return 'failed';
  }
}

const ALLOWED_COMMANDS = Object.freeze(["java"]);
const SAFE_PATTERN = /^[a-zA-Z0-9._\-\/: ]+$/;

function assertSafe(value, name) {
  const str = String(value).trim();
  if (!SAFE_PATTERN.test(str)) {
    throw new Error(`Unsafe value in ${name}: ${str}`);
  }
  return str;
}


module.exports = {
  downloadJar,
  runCommand,
}