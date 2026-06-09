// api/index.ts
import express from "express";

const app = express();
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, // dari Vercel env vars
    },
    body: JSON.stringify(req.body),
  });
  const data = await response.json();
  res.json(data);
});

export default app;
