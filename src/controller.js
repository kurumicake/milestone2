const fs = require("fs/promises");
const { createReadStream } = require("fs");
const { DEFAULT_HEADER } = require("./util/util");
const path = require("path");
const qs = require("querystring");
const ejs = require('ejs');
const formidable = require('formidable');
const util = require('./util/util');

const controller = {
    getFeedCSS: async (request, response) => {
        response.writeHead(200, { "Content-Type": "text/css" });
        createReadStream(path.join(__dirname, "views", "feed.css")).pipe(response);
    },
    getCSS: async (request, response) => {
        response.writeHead(200, { "Content-Type": "text/css" });
        createReadStream(path.join(__dirname, "views", "homepage.css")).pipe(response);
    },
    getHomePage: async (request, response) => {
        const database = await fs.readFile("database/data.json", "utf8");
        const usersArr = JSON.parse(database);
        const homepageHTML = path.join(__dirname, "views", "homepage.ejs");
        const html = await ejs.renderFile(homepageHTML, { users: usersArr });
        response.writeHead(200, { "Content-Type": "text/html" }); // Correct content type for HTML
        response.end(html);
    },
    sendFormData: (request, response) => {
        //where the choose image would be

        let body = "";

        request.on("data", function (data) {
            body += data;
        });

        request.on("end", function () {
            let post = qs.parse(body);
            console.log(post);
        });
    },
    getFile: async (request, response) => {
        const filePath = path.join(__dirname, request.url.replace(/^\/src\//, ''));
        const stream = createReadStream(filePath);

        stream.on('error', (error) => {
            if (error.code === 'ENOENT') {
                util.pageNotFound(response)
            } else {
                util.internalServerError(response,error)
            }
        });
        stream.pipe(response);
    },
    getFeed: async (request, response) => {
        try {
            const database = await fs.readFile("database/data.json", "utf8");
            const usersArr = JSON.parse(database);

            const url = new URL(request.url, `http://${request.headers.host}`);
            const username = url.searchParams.get('username');
            const user = usersArr.find(user => user.username === username);

            if (user) {
                const feedPath = path.join(__dirname, 'views', 'feed.ejs');
                const feed = await fs.readFile(feedPath, 'utf8');
                const userInfo = usersArr.find((user) => user.username === username);

                if (userInfo !== null) {
                    const renderedHtml = ejs.render(feed, { userInfo: user });
                    user.stats = userInfo;
                    response.setHeader("Content-Type", "text/html");
                    response.end(renderedHtml);
                } else {
                    response.writeHead(404, { "Content-Type": "text/plain" });
                    response.end("Instagram user info not found");
                }
            } 
        } catch (error) {
            console.error("Error:", error);
            response.writeHead(500, { "Content-Type": "text/plain" });
            response.end("Internal Server Error");
        }
    },
    uploadImages: (request, response) => {
        const form = new formidable.IncomingForm();
        form.keepExtensions = true; // Keep file extensions
        form.uploadDir = path.join(__dirname, 'uploads'); // Directory to save uploaded files
    
        form.parse(request, async (err, fields, files) => {
            console.log("hello")
            if (err) {
                console.error('Error during form parsing', err);
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                response.end('Error processing upload');
                return;
            }
    
            const username = fields.username;
            const uploadedFile = files.image;
            
            // Define the new path for the uploaded file
            const newFilePath = path.join(__dirname, 'uploads', `${username}-${uploadedFile.name}`);
            console.log(newFilePath);
    
            try {
                // Move the file from the temporary location to the new location
                await fs.rename(uploadedFile.filepath, newFilePath);
    
                // Respond to the client after successful upload
                response.writeHead(302, { 'Location': '/success' }); // Redirect to a success page
                response.end('File uploaded successfully');
            } catch (error) {
                console.error('Error handling the file:', error);
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                response.end('Error handling file after upload');
            }
        });
    }
}

module.exports = controller;

