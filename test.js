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