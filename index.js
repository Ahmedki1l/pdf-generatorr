require('dotenv').config();
const express = require('express');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

app.use(bodyParser.json());

app.post('/generateInvoice', async (req, res) => {
    try {
        const { htmlContent, orderId, bucket = process.env.AWS_BUCKET } = req.body;
        
        // Launch Puppeteer with no-sandbox for server environments
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();

        // Set the HTML content and wait until network is idle so external CSS/fonts load
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        // Generate the PDF with background graphics
        const buffer = await page.pdf({ format: 'A4', printBackground: true });
        
        await browser.close();

        const params = {
            Bucket: bucket,
            Key: `orders/${orderId}/invoice/file.pdf`,
            ACL: "public-read",
            Body: buffer,
            ContentType: 'application/pdf',
        };

        const data = await s3.upload(params).promise();
        res.status(200).json({ success: true, location: data.Location });
    } catch (err) {
        console.error('Error generating/uploading invoice:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
