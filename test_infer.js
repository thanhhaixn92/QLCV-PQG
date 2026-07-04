"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var zod_1 = require("zod");
var assignTaskSchema = zod_1.z.object({
    assigneeUid: zod_1.z.string().trim().min(1, "Mã người nhận không được để trống").nullable(),
    expectedVersion: zod_1.z.number().int().min(1, "expectedVersion phải lớn hơn hoặc bằng 1")
}).strict();
// print out if it is optional
