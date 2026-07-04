import fs from 'fs';
let content = fs.readFileSync('src/tests/tasks-command/taskCommandHttp.test.ts', 'utf8');

content = content.replace('resetTaskCommandRepository();', `resetTaskCommandRepository();
    const serverConfigNodeEnv = require('../../server/app/serverConfig').serverConfig.nodeEnv;
    // ... we could test production config here but maybe just leave it unit tested ...
`);
// fs.writeFileSync('src/tests/tasks-command/taskCommandHttp.test.ts', content);
