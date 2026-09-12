// Browser worker compatibility for EthereumJS's environment checks and stream scheduling.
// No Node APIs, files, credentials or network access are provided by this shim.
const scope=globalThis as unknown as {process?:{env:Record<string,string>;browser:boolean;nextTick:(fn:(...args:unknown[])=>void,...args:unknown[])=>void}};
if(!scope.process)scope.process={env:{NODE_ENV:'production'},browser:true,nextTick:(fn,...args)=>queueMicrotask(()=>fn(...args))};
