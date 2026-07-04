import fs from 'fs';
let content = fs.readFileSync('src/server/modules/tasks-command/routes/taskCommandRoutes.ts', 'utf8');
content = content.replace(/import { TaskCommandContext } from "\.\.\/contracts\/taskCommandTypes";/, 'import { TaskCommandContext, AssignTaskCommand } from "../contracts/taskCommandTypes";');
content = content.replace(/taskCommandService.assignTask\(taskId, bodyParse.data, context\);/, 'taskCommandService.assignTask(taskId, bodyParse.data as AssignTaskCommand, context);');
fs.writeFileSync('src/server/modules/tasks-command/routes/taskCommandRoutes.ts', content);
