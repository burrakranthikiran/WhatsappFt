const express = require('express');
const { Client, MessageMedia  } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const compression = require('compression');
const timeout = require('connect-timeout');
const cacheControl = require('express-cache-controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.use(express.json()); // For parsing JSON request bodies
app.use(compression()); // Compress responses to optimize bandwidth usage
app.use(timeout('60s')); // Set a timeout of 30 seconds for all routes
app.use(cacheControl({ maxAge: 600 })); // Cache responses for 10 minutes
app.set('view engine', 'ejs');
app.set('views', './views'); // Ensure you have a 'views' folder for EJS files
app.use(express.static('public')); // Serve static files from 'public' folder
app.use(express.json({ limit: '10mb' })); 

let client; // WhatsApp client
let isClientReady = false; // To track if WhatsApp client is ready
let qrCodeDataUrl = null; // To store the QR code
let isAuthenticated = false; // To track if the user is authenticated

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});


const upload = multer({ storage: storage });
// Route: Login Page
app.get('/dashboard', async (req, res) => {
    isClientReady = false;
    isAuthenticated = false;
    qrCodeDataUrl = null;
    let data = {
        scanned: false,
    }
    io.emit('whatsapp-status',data); 

    if (client && qrCodeDataUrl) {
        // Render the EJS template with the QR code data
        return res.render('dashboard', { qrCodeDataUrl });
    }

    client = new Client();

    // This flag prevents multiple responses
    let responseSent = false;

    client.on('qr', (qr) => {
        if (responseSent) return; // Prevent multiple responses
        qrcode.toDataURL(qr, (err, url) => {
            if (err) {
                if (!responseSent) {
                    responseSent = true;
                    return res.status(500).send({ error: 'Failed to generate QR code' });
                }
            }
            qrCodeDataUrl = url; // Cache the QR code
            if (!responseSent) {
                responseSent = true;
                res.render('dashboard', { qrCodeDataUrl });
            }
        });
    });

    client.on('ready', () => {
        isClientReady = true;
        isAuthenticated = true; // Mark user as authenticated
        console.log('WhatsApp Web is ready!');  
        
        if (isAuthenticated) {
            let data = {
                scanned: true,
                clientname : client.info.pushname,
               clientphone : client.info.wid.user,
            }
            io.emit('whatsapp-ready',data); 
            } else {
                let data = {
                    scanned: false,
                }
                io.emit('whatsapp-ready',data); 
            }
  
    });

    client.on('authenticated', () => {
        console.log('Authenticated with WhatsApp');
    });

    client.initialize();
});



app.get('/login', (req, res) => {
    isClientReady = false;
    isAuthenticated = false;
    qrCodeDataUrl = null; // Clear the QR code data
    res.render('login'); // Render the home page
});

app.get('/image/:filename', (req, res) => {
    console.log("Image name:", req.params.filename);

    const filename = req.params.filename;
    if (!filename) {
        return res.status(400).send('Filename is required');
    }

    const uploadFolder = path.join(__dirname, 'uploads');
    const filePath = path.join(uploadFolder, filename);

    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send('Image not found');
        }

        // Send the image with proper content type
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);

        // Stream the image to avoid loading it fully into memory
        const stream = fs.createReadStream(filePath);
        stream.pipe(res).on('error', (error) => {
            console.error('Stream error:', error);
            res.status(500).send('Error streaming image');
        });
    });
})

app.get('/useraccounts', (req, res) => {
    res.render('useraccounts'); // Render the home page
});

app.get('/dashboardNew', (req, res) => {
    res.render('dashboardNew'); // Render the home page
});

app.get('/log', (req, res) => {
    res.render('log'); // Render the home page
});

app.get('/users-create', (req, res) => {
    res.render('users-create'); // Render the home page
});

app.get('/users-edit/:id', (req, res) => {
    const userId = req.params.id;
    res.render('users-edit', { userId });
});

app.get('/personal-screen', (req, res) => {
    res.render('personal'); // Render the home page
});

app.get('/personal-screen-bulk', (req, res) => {
    res.render('personalbulk'); // Render the home page
});
app.get('/personal-screen-group-list', (req, res) => {
    res.render('personal-group-list'); // Render the home page
});
app.get('/personal-screen-group-create', (req, res) => {
    res.render('personal-group-create'); // Render the home page
});
// Route to render the personal-group-edit EJS file with id and grouptype parameters
app.get('/personal-screen-group-edit/:id/:grouptype', (req, res) => {
    
    res.render('personal-group-edit', { id: req.params.id, grouptype: req.params.grouptype });
});

app.get('/personal-screen-number-create', (req, res) => {
    res.render('personal-number-create'); // Render the home page
});
app.get('/personal-screen-number-edit/:id/:grouptype/:phonenumber/:name', (req, res) => {
    res.render('personal-number-edit', { id: req.params.id, grouptype: req.params.grouptype, phonenumber: req.params.phonenumber , name :req.params.name}); // Render the home page
});


app.get('/welcome-screen', (req, res) => {
    res.render('welcome'); // Render the welcome page
});
app.get('/pan-india-screen', (req, res) => {
    res.render('panindia'); // Render the welcome page
});
app.get('/bsp-party-screen', (req, res) => {
    res.render('bspparty'); // Render the welcome page
});



app.get('/check-scan-status', async (req, res) => {
    console.log("Checking scan status");
    console.log("isAuthenticated:", isAuthenticated);

    if (isAuthenticated) {
    let data = {
        scanned: true,
        clientname : client.info.pushname,
       clientphone : client.info.wid.user,
    }
        res.status(200).json(data);
    } else {
        let data = {
            scanned: false,
        }
        res.status(200).json(data);
    }
});

// API: Send a Message
app.post('/send-message', async (req, res) => {
    if (!isAuthenticated) {
        return res.status(400).send({ error: 'WhatsApp client is not ready. Please log in first.' });
    }

    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
        return res.status(400).send({ error: 'Phone number and message are required' });
    }

    try {
        // Send message via WhatsApp Web
        const response = await client.sendMessage(`${phoneNumber}@c.us`, message);
        res.status(200).send({ success: true, response });
    } catch (error) {
        res.status(500).send({ success: false, error: error.message });
    }
});


app.post('/pan-india-send-message', async (req, res) => {
            const message = req.body.message;
            const fileName = req.body.imagebase64;
            const phoneNumbersArray = req.body.phoneNumbersArray;
    try {
            // for(let phonenumber of phoneNumbersArray){
            //     let phnumber = "91"+phonenumber;
            //     //    console.log("phnumber",phnumber);
            //     }
        if (!isAuthenticated) {
            return res.status(400).send({ error: 'WhatsApp client is not ready. Please log in first.' });
        }
        if(fileName === "Empty"){
            for(let phonenumber of phoneNumbersArray){
                console.log("phonenumber", "91"+phonenumber);
                let phnumber = "91"+phonenumber;
            await client.sendMessage(`${phnumber}@c.us`, message);
            }

        }else{
            const base64Data = getFileAsBase64(fileName);
            for(let phonenumber of phoneNumbersArray){
                let phnumber = "91"+phonenumber;
                    const media = new MessageMedia('image/png', base64Data);
                    await client.sendMessage(`${phnumber}@c.us`, media);
                    await client.sendMessage(`${phnumber}@c.us`, message);
                }
            
        }
        res.status(200).send({ success: true }); 
    } catch (error) {
        res.status(500).send({ success: false, error: error.message });
    }
});



// Function to read a file from the uploads directory and convert it to base64
function getFileAsBase64(fileName) {
    const filePath = path.join(__dirname, 'uploads', fileName);

    try {
        // Read the file as a buffer
        const fileBuffer = fs.readFileSync(filePath);

        // Convert the buffer to a base64 string
        const base64String = fileBuffer.toString('base64');

        return base64String;
    } catch (error) {
        console.error('Error reading file:', error);
        return null;
    }
}



app.post('/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send({ error: 'No file uploaded' });
    }

    res.status(200).send({ message: 'File uploaded successfully', filename: req.file.filename });
});

// API: Logout
app.get('/logout', (req, res) => {
    if (client) {
        client.logout();
        client.destroy(); // Disconnect WhatsApp client
        client = null;
    }
    isClientReady = false;
    isAuthenticated = false;
    qrCodeDataUrl = null; // Clear the QR code data

    console.log('Logged out successfully.');
    res.status(200).send({ success: true, message: 'Logged out successfully' });
});

// Handle Timeout Errors Gracefully
app.use((req, res, next) => {
    if (!req.timedout) next();
    else res.status(500).render('error', { message: 'Request timeout. Please try again.' });
});

io.on('connection', (socket) => {
    // console.log('Client connected to WebSocket');
    // console.log("Checking scan status");
    // console.log("isAuthenticated:", isAuthenticated);

    if (isAuthenticated) {
    let data = {
        scanned: true,
        clientname : client.info.pushname,
       clientphone : client.info.wid.user,
    }
        io.emit('whatsapp-status',data); 
    } else {
        let data = {
            scanned: false,
        }
        io.emit('whatsapp-status',data); 
    }
    socket.on('disconnect', () => {
        console.log('Client disconnected from WebSocket');
    });
});
// Start the Express Server
const PORT = 3000;
server.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    const { default: open } = await import('open');
    await open(`http://localhost:${PORT}/login`);
});
