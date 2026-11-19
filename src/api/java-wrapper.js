const util = require('util');
const { exec, spawn } = require('child_process');
const execPromise = util.promisify(exec);
const core = require('@actions/core');

const javaWrapperDownloadUrl 
  = 'https://repo1.maven.org/maven2/com/veracode/vosp/api/wrappers/vosp-api-wrappers-java'
//26.3.19.0
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
  return new Promise((resolve) => {
    let output = '';
    let errorOutput = '';

    const child = spawn(command, args);

    child.stdout.on('data', (data) => {
      const str = data.toString();
      output += str;
      core.info(str);
    });

    child.stderr.on('data', (data) => {
      const str = data.toString();
      errorOutput += str;
      core.info(str);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        core.setFailed(`Command failed with exit code ${code}`);
        resolve('failed');
        return;
      }
      resolve(output);
    });

    child.on('error', (err) => {
      core.setFailed(`Command error: ${err.message}`);
      resolve('failed');
    });
  });
}

module.exports = {
  downloadJar,
  runCommand,
}