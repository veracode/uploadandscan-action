const { exec, execFileSync } = require('child_process');
const path = require('path')
const SAFE_STRING_PATTERN = /^[a-zA-Z0-9._\-\/: ]+$/;

function assertSafe(value, name) {
  const str = String(value).trim();
  if (!SAFE_STRING_PATTERN.test(str)) {
    throw new Error(`Unsafe value detected in ${name}: ${str}`);
  }
  return str;
}
module.exports.safeJavaExec = safeJavaExec;

function safeJavaExec(jarPath, action, params = {}) {
  // Validate jar
  const resolvedJar = path.resolve(String(jarPath).trim());
  if (!resolvedJar.endsWith(".jar")) {
    throw new Error(`Invalid jar: ${jarPath}`);
  }

  // Validate action against allowlist
  const ALLOWED_ACTIONS = [
    "UploadAndScanByAppId",
    "UploadAndScan",
    "DeleteScan",
    // add your actions here
  ];
  if (!ALLOWED_ACTIONS.includes(action)) {
    throw new Error(`Action not allowed: ${action}`);
  }

  // Validate every param key and value
  const args = ["-jar", resolvedJar, "-action", action];
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    args.push(`-${assertSafe(key, "param key")}`);
    args.push(assertSafe(value, `param value for ${key}`));
  }

  // Execute with no shell
  return execFileSync("java", args, {  // lgtm[js/shell-command-injection]
    encoding: "utf-8",
    shell: false,
    stdio: ["pipe", "pipe", "pipe"],
  });
}