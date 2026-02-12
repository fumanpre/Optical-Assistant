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

// connection to database
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

client.connect();

// personal information detection
function containsPII(text) {
  const emailRegex = /\S+@\S+\.\S+/;
  const phoneRegex = /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/;
  const healthCardRegex = /\b\d{10}\b/; // basic example

  return (
    emailRegex.test(text) || phoneRegex.test(text) || healthCardRegex.test(text)
  );
}

// API endpoint
app.post("/ask", async (req, res) => {
  try {
    let question = req.body.question;

    // response if query contains the personel information
    if (containsPII(question)) {
      return res.json({
        answer:
          "Personal patient information detected.\n\nFor privacy protection, please remove any personal information (names, phone numbers, addresses, health card numbers, etc.) and submit your query again.",
      });
    }

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });

    // Convert JS array into pgvector string
    const queryVector = `[${embeddingResponse.data[0].embedding.join(",")}]`;

    const result = await client.query(
      `SELECT content
         FROM documents
         ORDER BY embedding <-> $1::vector
         LIMIT 3`,
      [queryVector]
    );

    const context = result.rows.map((row) => row.content).join("\n");

    // using openAI to get the answer to the queries with restrictions imposed on the response generated
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

    // success return the response
    return res.json({
      type: "success",
      answer: completion.choices[0].message.content,
    });
  } catch (error) {
    // error handling
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
