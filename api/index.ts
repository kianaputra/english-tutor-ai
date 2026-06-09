import express from "express";

const app = express();
app.use(express.json());

// Salin semua routes dari server/index.ts ke sini
// Contoh:
app.post("/api/chat", async (req, res) => {
  // logic chat kamu
});

export default app;