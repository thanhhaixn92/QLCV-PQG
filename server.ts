import { createServer } from "./src/server/app/createServer";
import { createServer as createViteServer } from "vite";
import path from "path";
import express from "express";

async function startServer() {
  try {
    const app = await createServer();
    const PORT = Number(process.env.PORT ?? 3000);

    if (process.env.NODE_ENV !== "production") {
      console.log("Vite: Khởi chạy middleware hỗ trợ chuyển đổi tệp thời gian thực (Hot-reload)...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server QLCV_PQG Next chạy thành công tại http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("LỖI KHỞI ĐỘNG MÁY CHỦ THẤT BẠI:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

startServer();
