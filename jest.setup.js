// Jest setup file for API route tests
// This file sets up the test environment with necessary globals

// Polyfill for Request and Response if not available
if (typeof Request === 'undefined' || typeof Response === 'undefined') {
  // Use Node.js built-in fetch (available in Node 18+)
  // For older versions, you may need to install node-fetch
  const { Request, Response, Headers } = require('undici');
  global.Request = Request;
  global.Response = Response;
  global.Headers = Headers;
}
