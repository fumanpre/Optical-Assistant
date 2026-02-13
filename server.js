require("dotenv").config();
const express = require("express");
const cors = require("cors");
// for database related tasks
const { Client } = require("pg");
// for LLM related tasks
const OpenAI = require("openai");
// for pdf related tasks
const multer = require("multer");
const pdfParse = require("pdf-parse");

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const crypto = require("crypto");

// connection to database
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

client.connect();

// pdf multer setup
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// admin middleware for updating or deleting the PDF's
function adminOnly(req, res, next) {
  const key = req.headers["x-admin-key"];

  if (!key || key !== process.env.ADMIN_PASSCODE) {
    return res.status(403).json({ error: "Unauthorized: Invalid Admin Key" });
  }

  next();
}

// All the user defined functions below:
// personal information detection
function containsPII(text) {
  const emailRegex = /\S+@\S+\.\S+/;
  const phoneRegex = /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/;
  const healthCardRegex = /\b\d{10}\b/; // basic example

  return (
    emailRegex.test(text) || phoneRegex.test(text) || healthCardRegex.test(text)
  );
}

// function used in 'upload' endpoint for chunking the pdf
function chunkText(text, size = 400) {
  const words = text.split(" ");
  let chunks = [];

  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(" "));
  }

  return chunks;
}

//  ------------------ API endpoints -----------------------
// endpoint for uploading pdf
app.post("/upload", adminOnly, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // 1️⃣ Generate file hash to prevent duplicates
    const fileHash = crypto
      .createHash("sha256")
      .update(req.file.buffer)
      .digest("hex");

    // 2️⃣ Check if file already exists
    const existing = await client.query(
      "SELECT id FROM documents WHERE file_hash = $1",
      [fileHash]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "File already uploaded" });
    }

    // 3️⃣ Parse PDF
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "PDF contains no readable text" });
    }

    const chunks = chunkText(text);

    // 4️⃣ Insert into documents table (metadata only)
    const docResult = await client.query(
      `INSERT INTO documents (filename, file_hash, file_size)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [req.file.originalname, fileHash, req.file.size]
    );

    const docId = docResult.rows[0].id;

    // 5️⃣ Insert chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      const embeddingArray = embeddingResponse.data[0].embedding;
      const vectorString = `[${embeddingArray.join(",")}]`;

      await client.query(
        `INSERT INTO document_chunks (document_id, chunk_index, content, embedding)
        VALUES ($1, $2, $3, $4::vector)`,
        [docId, i, chunk, vectorString]
      );
    }

    res.json({ message: "File uploaded and processed successfully" });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// endpoint to get list of uploaded documents
app.get("/documents", adminOnly, async (req, res) => {
  try {
    const result = await client.query(
      "SELECT id, filename, file_size, created_at FROM documents ORDER BY created_at DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// endpoint for deleting the unwanted documents
app.delete("/documents/:id", adminOnly, async (req, res) => {
  try {
    const docId = req.params.id;

    await client.query("DELETE FROM documents WHERE id = $1", [docId]);

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// endpoint for asking question
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

    const startTime = Date.now();

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });

    const queryEmbeddingArray = embeddingResponse.data[0].embedding;
    const queryVector = `[${queryEmbeddingArray.join(",")}]`;

    const result = await client.query(
      `SELECT content
      FROM document_chunks
      ORDER BY embedding <-> $1::vector
      LIMIT 5`,
      [queryVector]
    );

    const context = result.rows.map((row) => row.content).join("\n");

    // using openAI to get the answer to the queries with restrictions imposed on the response generated
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        // System Guardrail Prompt
        {
          role: "system",
          content: `
              You are a clinical support assistant for optometry professionals.
              Do not provide medical diagnosis.
              Do not provide treatment instructions.
              Encourage consultation with licensed professionals.
            `,
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${question}`,
        },
      ],
    });

    const latency = Date.now() - startTime;

    // add data such as user question, latency in database
    try {
      await client.query(
        "INSERT INTO logging (question, latency_ms) VALUES ($1, $2)",
        [question, latency]
      );
    } catch (logError) {
      console.error("Logging failed:", logError.message);
      // Do NOT throw error — logging failure should not break user response
    }

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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
