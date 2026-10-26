// Load an optional dev dependency (Playwright, sharp) for browser tests and art tools.
// Looks in this order: an explicit path in an environment variable, a normal Node install
// (npm install <name>), then the Codex desktop runtime's bundled packages.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');

const CODEX_MODULES=path.join(os.homedir(),'.cache','codex-runtimes','codex-primary-runtime','dependencies','node','node_modules');
const DEFAULT_VARIABLES={playwright:'PLAYWRIGHT_MODULE',sharp:'SHARP_MODULE'};

function requireModule(name,variable=DEFAULT_VARIABLES[name]){
 if(variable&&process.env[variable])return require(process.env[variable]);
 try{return require(name)}catch(error){if(error.code!=='MODULE_NOT_FOUND'||!String(error.message).includes(`'${name}'`))throw error}
 const bundled=path.join(CODEX_MODULES,name);
 if(fs.existsSync(bundled))return require(bundled);
 throw Error(`${name} is not installed. Install it with "npm install ${name}"${name==='playwright'?' and "npx playwright install"':''}, or set ${variable||'the module path'} to its folder.`);
}

module.exports={requireModule};
