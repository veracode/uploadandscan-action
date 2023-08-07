const { minimatch } = require('minimatch')

// console.log(minimatch('bar.foo', 'b??.foo'));

const include = 'Antlr3*.dll,Verademo*.dll';
const modules = [
  "Antlr3.Runtime.dll"
]
const modulesToScan = include.trim().split(',');
let moduleIds = [];
modulesToScan.forEach(moduleName => {
  const module = modules.find(m => minimatch(m.name.toLowerCase(), moduleName.trim().toLowerCase()))
  if (module) {
    moduleIds.push(module.id);
  }
});
console.log(moduleIds);