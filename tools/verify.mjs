import { verifyPackage } from './integrity.mjs';
const root=process.argv[2]||'.';
try { const result=await verifyPackage(root);console.log(`SHA-256 und Dateiliste stimmen: ${result.files} Runtime-Dateien.`); }
catch(error) {console.error(error.message);process.exitCode=1;}
