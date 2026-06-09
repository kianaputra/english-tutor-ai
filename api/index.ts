import express from "express";

const app = express();
app.use(express.json());

// Pindahkan semua API routes kamu ke sini
// Contoh:
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Tambahkan routes lainnya dari server kamu...

export default app;
