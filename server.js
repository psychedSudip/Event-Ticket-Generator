const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const { PDFDocument, rgb } = require("pdf-lib");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");
const app = express();

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configure Multer for file uploads
const upload = multer({ dest: "uploads/" }); // Uploaded files will be stored in the "uploads" directory

// Serve HTML form
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "form.html"));
});

// Handle form submission
app.post("/generate-pdf", upload.single("photo"), async (req, res) => {
  console.log("Received Data:", req.body); // Debug log
  console.log("Uploaded File:", req.file); // Debug log for the uploaded file

  const { name, age, sem, roll, email } = req.body;
  const uploadedPhotoPath = req.file ? req.file.path : null;

  // Generate a UUID
  const uuid = uuidv4();
  console.log("Generated UUID:", uuid);

  // Generate QR Code
  const qrCodePath = "qrcode.png";
  await QRCode.toFile(qrCodePath, uuid);

  // Validate fields
  if (!name || !age) {
    console.error("Validation Error: Missing required fields");
    return res.status(400).send("All fields are required!");
  }

  try {
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 600]); // Adjusted size for content

    // Add user-provided content
    page.drawText(`CSIT Welcome Program`, {
      x: 150,
      y: 550,
      size: 20,
      color: rgb(0, 0, 0.7),
    });
    page.drawText(`Name: ${name}`, { x: 50, y: 500, size: 14 });
    page.drawText(`Age: ${age}`, { x: 50, y: 470, size: 14 });
    page.drawText(`Semester: ${sem}`, { x: 50, y: 440, size: 14 });
    page.drawText(`Roll: ${roll}`, { x: 50, y: 410, size: 14 });
    page.drawText(`Email: ${email}`, { x: 50, y: 380, size: 14 });

    // Add user-uploaded photo if available
    if (uploadedPhotoPath) {
      const photoBytes = fs.readFileSync(uploadedPhotoPath);
      const userPhoto = await pdfDoc.embedJpg(photoBytes);
      page.drawImage(userPhoto, {
        x: 50,
        y: 250,
        width: 100,
        height: 100,
      });

      // Remove the file after processing
      fs.unlinkSync(uploadedPhotoPath);
    }

    // Add QR Code to PDF
    const qrCodeBytes = fs.readFileSync(qrCodePath);
    const qrCodeImage = await pdfDoc.embedPng(qrCodeBytes);
    page.drawImage(qrCodeImage, {
      x: 200,
      y: 250,
      width: 100,
      height: 100,
    });

    // Remove the QR code file after processing
    fs.unlinkSync(qrCodePath);

    // Save PDF and send response
    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Disposition", 'attachment; filename="form.pdf"');
    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).send("An error occurred while generating the PDF.");
  }
});

// Start the server
const PORT = 3000;
const IP4 = "0.0.0.0";
app.listen(PORT, IP4, () => {
  console.log(
    `Server is running at http://localhost:${PORT} and http://${IP4}`
  );
});
