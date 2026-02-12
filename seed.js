require("dotenv").config();
const { Client } = require("pg");
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// connect to database to add embedding
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// list of response might be suitable for queries asked
const documents = [
  // Company Overview
  "Optical-Assist is a Canadian practice management software designed specifically for optometry clinics and eye care professionals.",
  "Optical-Assist has supported Canadian optometrists for over 30 years with tools for scheduling, billing, EMR, and inventory management.",
  "Optical-Assist focuses on improving clinic efficiency and enhancing patient care through streamlined workflows.",
  "Optical-Assist operates within an Agile Scrum development environment with cross-functional teams.",

  //  Appointment Policies
  "Patients should avoid driving for 4-6 hours after pupil dilation.",
  "Appointments can be cancelled 24 hours in advance without penalty.",
  "Missed appointments without notice may result in a cancellation fee.",
  "Appointment reminders are automatically sent via SMS or email 24 hours before the scheduled visit.",
  "Online booking is available through the patient portal.",
  "Emergency eye appointments are prioritized within clinic scheduling workflows.",

  // Insurance & Billing
  "Our clinic accepts major insurance providers including SunLife, BlueCross, Manulife, and GreenShield.",
  "Direct insurance billing is supported through Optical-Assist integrated billing module.",
  "OHIP billing codes are integrated within the software for Ontario clinics.",
  "Patients are responsible for co-payments not covered by insurance.",
  "Insurance claims can be submitted electronically through the system.",
  "Billing reports can be generated daily, weekly, or monthly for reconciliation.",

  // Contact Lens & Eyewear Policies
  "Contact lenses should be cleaned daily with recommended solution.",
  "Patients must attend a contact lens fitting before purchasing lenses.",
  "Prescription glasses are typically ready within 7 to 10 business days.",
  "Warranty coverage applies to manufacturer defects within 12 months.",
  "Frame adjustments are complimentary within 30 days of purchase.",

  //  Clinical Guidelines
  "Routine eye exams are recommended every 1-2 years depending on age and risk factors.",
  "Children under 19 may qualify for provincially funded eye exams.",
  "Digital retinal imaging is recommended for comprehensive eye health assessments.",
  "Patients with diabetes should schedule annual eye exams.",
  "Visual field testing is used to detect glaucoma progression.",

  //  Software Features
  "Optical-Assist includes an integrated Electronic Medical Records (EMR) system.",
  "The system supports inventory management for frames, lenses, and contact lenses.",
  "User permissions can be configured based on staff roles.",
  "Audit logs track changes made to patient records.",
  "Optical-Assist supports automated backup and secure data storage.",
  "The reporting module provides financial, clinical, and operational insights.",
  "The software supports barcode scanning for inventory tracking.",
  "Multi-location clinics can manage centralized reporting through the system.",

  //Security & Compliance
  "Patient data is encrypted both in transit and at rest.",
  "Optical-Assist complies with Canadian privacy regulations including PIPEDA.",
  "Role-based access control ensures secure patient information management.",
  "Regular system updates include security patches and performance improvements.",
  "Two-factor authentication can be enabled for additional security.",

  // Technical Support
  "Technical support is available via phone and email during business hours.",
  "System updates are deployed periodically to improve functionality.",
  "Bug reports can be submitted through the internal ticketing system.",
  "Training sessions are available for new clinic staff.",
  "Data migration services are offered when switching from other practice management systems.",

  // Patient Communication
  "Patients can access their prescriptions through the secure patient portal.",
  "Appointment confirmations can be sent via SMS or email.",
  "Recall reminders notify patients when their next exam is due.",
  "Marketing campaigns can be managed through integrated communication tools.",

  //  Data & Reporting
  "Clinic performance dashboards provide real-time analytics.",
  "Revenue reports can be filtered by provider, location, or date range.",
  "Patient retention rates can be tracked through reporting modules.",
  "Inventory turnover reports help optimize stock management.",

  // Internal Culture
  "Optical-Assist promotes continuous learning and professional growth.",
  "Summer interns are encouraged to participate in sprint planning sessions.",
  "Mentorship is provided to junior developers throughout the internship.",
  "Developers are expected to write clean, maintainable code.",
  "Collaboration and communication are key components of team success.",
];

async function seed() {
  await client.connect();

  // using chatgpt text-embedding-3-small to generate the embedding
  for (let doc of documents) {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: doc,
    });

    // making sure the vector structure is suitable in order to add it to database
    const vector = `[${embedding.data[0].embedding.join(",")}]`;

    // this is where we insert into the database
    await client.query(
      "INSERT INTO documents (content, embedding) VALUES ($1, $2)",
      [doc, vector]
    );
  }

  console.log("Seed complete");
  await client.end();
}

seed();
