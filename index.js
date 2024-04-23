const express = require("express");
const csv = require("csvtojson");
const fs = require("fs");
const path = require("path");
const fetch = require('node-fetch')
const bodyParser = require("body-parser");
const { AES, enc } = require('crypto-js');

const app = express();
const port = 8080;

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  console.log('route hit');
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/upload-csv", async (req, res) => {
  try {
    if (!req.body.encryptedFile) {
      return res.status(400).json({ error: "No file provided" });
    }

    const encryptedContent = req.body.encryptedFile;
    const decryptedContent = AES.decrypt(encryptedContent, 'your-secret-key').toString(enc.Utf8);
    const jsonObj = await csv().fromString(decryptedContent);

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

    fs.writeFileSync("GrowthRatingBypass.json", JSON.stringify(responseData), "utf-8");

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
  }
});

function pingServer() {
  fetch('https://csvtojsonforcompapp.onrender.com/')
    .then(response => response.text())
    .catch(err => console.error('Error pinging server:', err));
}

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
  setInterval(pingServer, 200000);
});
