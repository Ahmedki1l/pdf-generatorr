const express = require('express');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

AWS.config.update({
    accessKeyId: "AKIA5IUPQWCFCEJK5O5M",
    secretAccessKey: "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",
    region: "eu-central-1"
});
const s3 = new AWS.S3();
app.use(bodyParser.json());

app.post('/generateInvoice', async (req, res) => {
    let browser;
    try {
        const { htmlContent, orderId, bucket = "phase2anaostori" } = req.body;

        // Local development: use Puppeteer's bundled Chromium
        browser = await puppeteer.launch({ args: ['--no-sandbox'] });

        const page = await browser.newPage();
        // Wait until network is idle so that external CSS/fonts are loaded
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
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
        console.log('Successful upload:', data.Location);
        res.status(200).json({ success: true, location: data.Location });
    } catch (err) {
        if (browser) await browser.close();
        console.error('Error generating/uploading invoice:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
