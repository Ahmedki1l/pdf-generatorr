import express from 'express';
import { config, S3 } from 'aws-sdk';
import { json } from 'body-parser';
import { launch } from 'puppeteer';
import axios from 'axios';
const app = express();
const port = process.env.PORT || 3000;

config.update({
    accessKeyId: "AKIA5IUPQWCFCEJK5O5M",
    secretAccessKey: "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",
    region: "eu-central-1"
});
const s3 = new S3();
app.use(json());

// ---------------------------------------------------------------------
// Payment Verification Webhook
// This endpoint wraps your _verifyTabbyPayment logic so that multiple
// requests can be made safely (idempotently) to capture the payment.
app.post('/verifyTabbyPaymentWebhook', async (req, res) => {
    try {
        // Wrap the request body into an event object expected by _verifyTabbyPayment
        const event = { body: JSON.stringify(req.body) };
        const response = await axios.post(
            'https://yts36bs5s8.execute-api.eu-central-1.amazonaws.com/orders/verifyTabbyPayment',
            event
        );
        // Expect response to have statusCode and body properties
        res.status(response.statusCode).json(JSON.parse(response.body));
    } catch (err) {
        console.error("Error in payment verification webhook:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/generateInvoice', async (req, res) => {
    let browser;
    try {
        const { htmlContent, orderId, bucket = "phase2anaostori" } = req.body;

        // Local development: use Puppeteer's bundled Chromium
        browser = await launch({ args: ['--no-sandbox'] });

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
