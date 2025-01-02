const util = require('util');
const { exec, execFileSync } = require('child_process');
const execPromise = util.promisify(exec);
const core = require('@actions/core');

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

async function runCommand (command, args = []){
  try {
    return execFileSync(command, args);
  } catch (error){
    // console.error('Error Output:', error.output?.toString('utf8'));
    // console.error('Error Stdout:', error.stdout?.toString('utf8')); // Stdout buffer
    // console.error('Error Stderr:', error.stderr?.toString('utf8')); // Stderr buffer
    console.error('Error:', error);
    console.error('Error Output:', error.output?.toString());
    console.error('Error Stdout:', error.stdout?.toString()); // Stdout buffer
    console.error('Error Stderr:', error.stderr?.toString());
    console.error('Error Message:', error.message);
    return 'failed';
  }
}

module.exports = {
  downloadJar,
  runCommand,
}