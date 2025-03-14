const express = require("express");
const app = express();
const { google } = require("googleapis");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");

dotenv.config(); // Load environment variables

const FILE_ID = "1VAK2TZXM0eKyUQnARb9gk-Cadx3Uzn96Nputsc8dXgI";
const NEW_OWNER_EMAIL = "dodongrblase@gmail.com";
const EMAIL_USER = "franciscocarinoiii@gmail.com";
const EMAIL_PASS = "M@st3rk3y1234";

console.log("FILE_ID:", FILE_ID);
console.log("NEW_OWNER_EMAIL:", NEW_OWNER_EMAIL);

if (!FILE_ID || !NEW_OWNER_EMAIL || !EMAIL_USER || !EMAIL_PASS) {
    console.error("❌ Missing required environment variables.");
    process.exit(1);
}

// Authenticate
async function authenticate() {
    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: ["https://www.googleapis.com/auth/drive"],
    });

    return await auth.getClient();
}

// Send email
async function sendEmail(to, subject, text) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });

    let info = await transporter.sendMail({
        from: `"Ownership Transfer Service" <${EMAIL_USER}>`,
        to: to,
        subject: subject,
        text: text,
    });

    console.log("Email sent: %s", info.messageId);
}

// Share file with new owner
async function transferOwnership(fileId, newOwnerEmail) {
    try {
        const authClient = await authenticate();
        const drive = google.drive({ version: "v3", auth: authClient });

        console.log("Transferring ownership for fileId:", fileId);

        // Step 1: Check existing permissions
        const permissions = await drive.permissions.list({ fileId });
        const existingPermission = permissions.data.permissions.find(
            (perm) => perm.emailAddress === newOwnerEmail
        );

        if (existingPermission) {
            console.log(`⚠️ ${newOwnerEmail} already has access.`);
        } else {
            // Step 2: Add new owner as a writer
            await drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: "writer",
                    type: "user",
                    emailAddress: newOwnerEmail,
                },
            });
            console.log(`✅ Added ${newOwnerEmail} as writer.`);
        }

        console.log("⚠️ Google Drive API does NOT allow direct ownership transfer.");
        console.log("ℹ️ The new owner must manually accept ownership in Google Drive.");

        // Send email to new owner
        const emailSubject = "Accept Ownership Transfer";
        const emailText = `You have been added as a writer to the file. Please accept the ownership transfer in Google Drive.`;
        await sendEmail(newOwnerEmail, emailSubject, emailText);
    } catch (error) {
        console.error("❌ Error transferring ownership:", error);
    }
}

// Root route
app.get("/", (req, res) => {
    res.send("Welcome to the Google Drive Ownership Transfer Service!");
});

app.get("/transfer", async (req, res) => {
    try {
        await transferOwnership(FILE_ID, NEW_OWNER_EMAIL);
        res.send(`Ownership transfer process started for ${NEW_OWNER_EMAIL}`);
    } catch (error) {
        console.error("❌ Error transferring ownership:", error);
        res.status(500).send("Failed to transfer ownership");
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});