const fs = require("fs/promises");
const { createReadStream } = require("fs");
const { DEFAULT_HEADER } = require("./util/util");
const path = require("path");
const qs = require("querystring");
const ejs = require('ejs');
const { formidable } = require('formidable');
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
                util.internalServerError(response, error)
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
    uploadImages: async (request, response) => {
        const uploadDir = path.join(__dirname, "uploads")
        const form = formidable({ keepExtension: true, uploadDir: uploadDir});
        form.parse(request, async (err, fields, files) => {
            //error handle
            if (err) {
                console.error('Error during form parsing', err);
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                response.end('Error processing upload');
                return;
            }
            try {
                const username = fields.username[0];
                console.log()
                await processUpload(files, username);
                response.writeHead(302, { location: "/" });
                response.end();
            } catch {
                console.error('Error handling the file:', err);
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                response.end('Error handling file after upload');
            }
        })
    }
}
//helper functions 

const processUpload = async (files, username) => {
    console.log(files)
    const oldPath = files.image[0].filepath; 
    const filename = files.image[0].originalFilename;
    const newPath = path.join(__dirname, "photos", username, filename);

    try {
        await fs.rename(oldPath, newPath); // Move file to new location

        // Update the data.json file
        const database = await fs.readFile("database/data.json", "utf8");
        const usersArr = JSON.parse(database);
        const userInfo = usersArr.find(user => user.username === username);

        if (userInfo) {
            userInfo.photos.push(filename); // Add new photo
            await fs.writeFile("database/data.json", JSON.stringify(usersArr, null, 2)); // Write back the updated array
        }
    } catch (err) {
        console.error('Error in processUpload:', err);
        throw err; 
    }
}

module.exports = controller;

