const DEFAULT_HEADER = { "content-type": "text/html" };

// Handle 404 Page Not Found
const pageNotFound = (response) => {
  response.writeHead(404, DEFAULT_HEADER);
  createReadStream(path.join(__dirname, "views", "404.html"), "utf8").pipe(response);
};

// Handle 500 Internal Server Error
const internalServerError = (response, error) => {
  console.error('Internal Server Error:', error);
  response.writeHead(500, DEFAULT_HEADER);
  if (process.env.NODE_ENV === 'development') {
    response.end(`Internal Server Error: ${error.stack}`);
  } else {
    response.end('Internal Server Error');
  }
};

module.exports = {
  DEFAULT_HEADER,
  pageNotFound,
  internalServerError
};
