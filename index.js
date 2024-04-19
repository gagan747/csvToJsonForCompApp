const express = require("express");
const multer = require("multer");
const csv = require("csvtojson");
const fs = require("fs");
const path = require("path");

const fetch = require('node-fetch')
//const fetch = require('node-fetch'); // Require node-fetch

const app = express();
const port = 8080;

// Set up multer to handle file uploads
const upload = multer({ dest: "uploads/" });

// Serve HTML form for uploading CSV
app.get("/", (req, res) => {
 console.log('rote hitted')
 res.sendFile(path.join(__dirname, "index.html"));
});

// Route to handle file upload and conversion
app.post("/upload-csv", upload.single("csvFile"), async (req, res) => {
 try {
  // Check if file is provided
  if (!req.file) {
   return res.status(400).json({ error: "No file provided" });
  }


  // Convert CSV to JSON
  const jsonObj = await csv().fromFile(req.file.path);

  const formattedData = jsonObj.map((d) => ({
   ...d,
   employeeId: +d.employeeId,
   year: +d.year,
   rating: +d.rating,
   businessUnit: d?.businessUnit === "" ? [] : d?.businessUnit?.split(",")?.map((d) => d?.trim()),
   active: d?.active === "TRUE",
   competencyChange: d?.competencyChange === "TRUE",
   recommendedForPromotion: d?.recommendedForPromotion === "TRUE",
   competency: d?.competency === "null" ? null : d?.competency,
  }));

  const responseData = [
   {
    name: "offlineGrowthRating",
    data: formattedData.reduce((acc, emp) => {
     acc[emp.employeeId.toString()] = emp;
     return acc;
    }, {}),
   },
  ];

  // Write JSON data to file
  fs.writeFileSync("GrowthRatingBypass.json", JSON.stringify(responseData), "utf-8");

  // Send the file as an attachment
  res.download("GrowthRatingBypass.json", (err) => {
   if (err) {
    console.error("Error downloading file:", err);
    res.status(500).json({ error: "Error downloading JSON file" });
   }
   if (fs.existsSync("GrowthRatingBypass.json")) {
    fs.unlinkSync("GrowthRatingBypass.json");
   }
  });
 } catch (err) {
  console.error("Error:", err);
  res.status(500).json({ error: "Error" });
 } finally {
  // Delete uploaded file
  if (req.file) {
   fs.unlinkSync(req.file.path);
  }
 }
});

function pingServer() {
 fetch('https://csvtojsonforcompapp.onrender.com/') // Replace with your actual deployment URL
  .then(response => response.text())
  .catch(err => console.error('Error pinging server:', err));
}

// Start the server
app.listen(port, () => {
 console.log(`Server is listening on port ${port}`);
 setInterval(pingServer, 120000);
});
