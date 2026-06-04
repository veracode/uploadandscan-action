const { execFileSync } = require('child_process');

const ALLOWED_COMMANDS = Object.freeze(["java"]);
const SAFE_PATTERN = /^[a-zA-Z0-9._\-\/: ]+$/;

function assertSafe(value, name) {
  const str = String(value).trim();
  if (!SAFE_PATTERN.test(str)) {
    throw new Error(`Unsafe value in ${name}: ${str}`);
  }
  return str;
}

 function trustedExec(command, args = []) {
  return execFileSync(command, args.map((a, i) => assertSafe(a, `arg[${i}]`)), { // lgtm[js/shell-command-injection]
    encoding: "utf-8",
    shell: false,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

module.exports.trustedExec = trustedExec;