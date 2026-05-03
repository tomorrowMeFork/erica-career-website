import { getFreshnessStatus, listLocalKnowledgeBaseDirs } from "../src/operations/freshness-status.js";

const directories = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const status = getFreshnessStatus({ directories: directories.length > 0 ? directories : listLocalKnowledgeBaseDirs(process.cwd()) });

console.log(JSON.stringify(status, null, 2));
