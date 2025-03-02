const { generateInvoice } = require('./handler'); // Adjust the path if needed

// Create a sample event that mimics what API Gateway would send
const testEvent = {
  body: JSON.stringify({
    htmlContent: "<html><body><h1>Test Invoice</h1><p>This is a test invoice.</p></body></html>",
    orderId: "testOrder001",
    bucket: "phase2anaostori"  // Use your runtime S3 bucket
  })
};

(async () => {
  try {
    const result = await generateInvoice(testEvent);
    console.log("Function response:", result);
  } catch (error) {
    console.error("Error during function execution:", error);
  }
})();
