import fs from 'fs';
let content = fs.readFileSync('src/tests/tasks-command/taskCommandHttp.test.ts', 'utf8');
content = content.replace(/const { getTaskCommandRepository, resetTaskCommandRepository: resetConfigRepo } = require\('\.\.\/\.\.\/server\/modules\/tasks-command\/data\/taskCommandRepository'\);/, '');
content = content.replace(/const { serverConfig } = require\('\.\.\/\.\.\/server\/app\/serverConfig'\);/, '');
content = content.replace(/import \{ FirestoreTaskCommandRepository \} from "\.\.\/\.\.\/server\/modules\/tasks-command\/data\/firestoreTaskCommandRepository";/, 'import { FirestoreTaskCommandRepository } from "../../server/modules/tasks-command/data/firestoreTaskCommandRepository";\nimport { getTaskCommandRepository } from "../../server/modules/tasks-command/data/taskCommandRepository";\nimport { serverConfig } from "../../server/app/serverConfig";');
content = content.replace(/resetConfigRepo\(\)/g, 'resetTaskCommandRepository()');
fs.writeFileSync('src/tests/tasks-command/taskCommandHttp.test.ts', content);
