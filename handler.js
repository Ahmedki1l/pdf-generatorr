const AWS = require('aws-sdk');
const chrome = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

exports.generateInvoice = async (event) => {
  // API Gateway sends body as a string, so parse it:
  const { htmlContent, orderId, bucket } = JSON.parse(event.body);
  
  let browser = null;
  try {
    // Launch headless Chrome using chrome-aws-lambda
    browser = await puppeteer.launch({
      args: chrome.args,
      executablePath: await chrome.executablePath,
      headless: chrome.headless,
    });
    
    const page = await browser.newPage();
    // Set content and wait for external assets (like CSS/fonts) to load
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate PDF buffer with background graphics
    const buffer = await page.pdf({ format: 'A4', printBackground: true });
    
    await browser.close();

    // Set up S3 upload
    const s3 = new AWS.S3();
    const params = {
      Bucket: bucket, // Ensure this environment variable is set or passed in your request
      Key: `orders/${orderId}/invoice/file.pdf`,
      ACL: 'public-read',
      Body: buffer,
      ContentType: 'application/pdf',
    };
    
    const data = await s3.upload(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, location: data.Location }),
    };
  } catch (error) {
    if (browser) await browser.close();
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
