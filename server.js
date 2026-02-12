require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Client } = require("pg");
const OpenAI = require("openai");

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

client.connect();

function maskPII(text) {
  return text
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, "[NAME]")
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE]");
}

app.post("/ask", async (req, res) => {
  try {
    let question = maskPII(req.body.question);

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });

    // Convert JS array → pgvector string
    const queryVector = `[${embeddingResponse.data[0].embedding.join(",")}]`;

    const result = await client.query(
      `SELECT content
         FROM documents
         ORDER BY embedding <-> $1::vector
         LIMIT 3`,
      [queryVector]
    );

    const context = result.rows.map((row) => row.content).join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant for an optometry clinic. Use only the provided context. Do not give medical diagnosis.",
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${question}`,
        },
      ],
    });

    res.json({ answer: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
