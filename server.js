const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const XLSX = require('xlsx');
const csv = require('csv-parser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure directories exist
fs.ensureDirSync('uploads');
fs.ensureDirSync('logs');
fs.ensureDirSync('media');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'contactFile') {
      cb(null, 'uploads/');
    } else if (file.fieldname === 'mediaFile') {
      cb(null, 'media/');
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// WhatsApp client setup
let client;
let isClientReady = false;
let qrCodeData = null;

function initializeWhatsAppClient() {
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', (qr) => {
    console.log('QR Code received');
    qrcode.toDataURL(qr, (err, url) => {
      if (err) {
        console.error('Error generating QR code:', err);
        return;
      }
      qrCodeData = url;
      io.emit('qr', url);
    });
  });

  client.on('ready', () => {
    console.log('WhatsApp client is ready!');
    isClientReady = true;
    qrCodeData = null;
    io.emit('ready');
  });

  client.on('authenticated', () => {
    console.log('WhatsApp client authenticated');
    io.emit('authenticated');
  });

  client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
    io.emit('auth_failure', msg);
  });

  client.on('disconnected', (reason) => {
    console.log('WhatsApp client disconnected:', reason);
    isClientReady = false;
    io.emit('disconnected', reason);
  });

  client.initialize();
}

// Initialize WhatsApp client
initializeWhatsAppClient();

// Logging function
function logMessage(contact, status, message, error = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    contact,
    status,
    message,
    error
  };
  
  const logFile = `logs/messages-${new Date().toISOString().split('T')[0]}.json`;
  
  let logs = [];
  if (fs.existsSync(logFile)) {
    try {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    } catch (e) {
      logs = [];
    }
  }
  
  logs.push(logEntry);
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  
  // Emit to frontend
  io.emit('messageLog', logEntry);
}

// Parse contact file
async function parseContactFile(filePath, fileType) {
  const contacts = [];
  
  if (fileType === 'csv') {
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Support different column names
          const number = row.number || row.phone || row.mobile || row.Number || row.Phone || row.Mobile;
          const name = row.name || row.Name || row.firstName || row.first_name || 'Contact';
          
          if (number) {
            contacts.push({ number: number.toString(), name: name.toString() });
          }
        })
        .on('end', () => {
          resolve(contacts);
        })
        .on('error', reject);
    });
  } else if (fileType === 'xlsx') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    data.forEach(row => {
      const number = row.number || row.phone || row.mobile || row.Number || row.Phone || row.Mobile;
      const name = row.name || row.Name || row.firstName || row.first_name || 'Contact';
      
      if (number) {
        contacts.push({ number: number.toString(), name: name.toString() });
      }
    });
    
    return contacts;
  }
  
  throw new Error('Unsupported file type');
}

// Format phone number
function formatPhoneNumber(number) {
  // Remove all non-digit characters
  let cleaned = number.replace(/\D/g, '');
  
  // Add country code if not present (assuming default country code)
  if (!cleaned.startsWith('91') && cleaned.length === 10) {
    cleaned = '91' + cleaned; // Default to India, change as needed
  }
  
  return cleaned + '@c.us';
}

// Replace placeholders in message
function replacePlaceholders(message, contact) {
  return message.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return contact[key] || match;
  });
}

// Send bulk messages
async function sendBulkMessages(contacts, message, mediaPath = null, delay = 5000) {
  if (!isClientReady) {
    throw new Error('WhatsApp client is not ready');
  }

  let media = null;
  if (mediaPath && fs.existsSync(mediaPath)) {
    media = MessageMedia.fromFilePath(mediaPath);
  }

  const results = {
    total: contacts.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const formattedNumber = formatPhoneNumber(contact.number);
    const personalizedMessage = replacePlaceholders(message, contact);

    try {
      // Check if number exists on WhatsApp
      const numberId = await client.getNumberId(formattedNumber);
      
      if (numberId) {
        if (media) {
          await client.sendMessage(numberId._serialized, media, { caption: personalizedMessage });
        } else {
          await client.sendMessage(numberId._serialized, personalizedMessage);
        }
        
        results.sent++;
        logMessage(contact, 'success', personalizedMessage);
        
        // Emit progress to frontend
        io.emit('messageProgress', {
          current: i + 1,
          total: contacts.length,
          contact: contact,
          status: 'sent'
        });
      } else {
        results.failed++;
        const error = 'Number not found on WhatsApp';
        results.errors.push({ contact, error });
        logMessage(contact, 'failed', personalizedMessage, error);
        
        io.emit('messageProgress', {
          current: i + 1,
          total: contacts.length,
          contact: contact,
          status: 'failed',
          error: error
        });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ contact, error: error.message });
      logMessage(contact, 'failed', personalizedMessage, error.message);
      
      io.emit('messageProgress', {
        current: i + 1,
        total: contacts.length,
        contact: contact,
        status: 'failed',
        error: error.message
      });
    }

    // Add delay between messages (except for the last one)
    if (i < contacts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return results;
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
  res.json({
    isReady: isClientReady,
    qrCode: qrCodeData
  });
});

app.post('/api/upload-contacts', upload.single('contactFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const fileType = fileExtension === '.csv' ? 'csv' : 'xlsx';
    
    const contacts = await parseContactFile(req.file.path, fileType);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ contacts, count: contacts.length });
  } catch (error) {
    console.error('Error parsing contacts:', error);
    res.status(500).json({ error: 'Failed to parse contact file' });
  }
});

app.post('/api/send-messages', upload.single('mediaFile'), async (req, res) => {
  try {
    const { contacts, message, delay = 5000 } = req.body;
    
    if (!contacts || !message) {
      return res.status(400).json({ error: 'Contacts and message are required' });
    }

    if (!isClientReady) {
      return res.status(400).json({ error: 'WhatsApp client is not ready' });
    }

    const parsedContacts = JSON.parse(contacts);
    const mediaPath = req.file ? req.file.path : null;
    
    // Start sending messages in background
    sendBulkMessages(parsedContacts, message, mediaPath, parseInt(delay))
      .then(results => {
        io.emit('bulkComplete', results);
        
        // Clean up media file after sending
        if (mediaPath) {
          setTimeout(() => {
            if (fs.existsSync(mediaPath)) {
              fs.unlinkSync(mediaPath);
            }
          }, 60000); // Delete after 1 minute
        }
      })
      .catch(error => {
        console.error('Bulk send error:', error);
        io.emit('bulkError', error.message);
      });

    res.json({ message: 'Bulk sending started' });
  } catch (error) {
    console.error('Error starting bulk send:', error);
    res.status(500).json({ error: 'Failed to start bulk sending' });
  }
});

app.get('/api/logs', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logFile = `logs/messages-${today}.json`;
    
    if (fs.existsSync(logFile)) {
      const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      res.json(logs);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send current status to new client
  socket.emit('status', {
    isReady: isClientReady,
    qrCode: qrCodeData
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Dashboard available at: http://localhost:${PORT}`);
});