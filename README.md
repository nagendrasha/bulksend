# WhatsApp Bulk Sender

A complete WhatsApp bulk messaging system with a mobile-optimized web dashboard and Node.js backend using whatsapp-web.js.

## Features

✅ **Mobile-Optimized Web Dashboard**
- Upload contact lists (.csv or .xlsx)
- Compose messages with placeholder support ({{name}})
- Upload media files (JPG, PNG, PDF)
- Set custom message delays
- Real-time progress tracking
- Comprehensive logging

✅ **Backend Automation**
- WhatsApp Web integration using whatsapp-web.js
- QR code authentication
- Bulk message sending with delays
- Success/failure logging
- Socket.io for real-time updates

✅ **Advanced Features**
- Drag & drop file uploads
- Message personalization with placeholders
- Media attachment support
- Progress tracking with live updates
- Comprehensive error handling
- Mobile-responsive design

## Installation

1. **Clone or download the project**
   ```bash
   cd d:/mern/bulksender
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Access the dashboard**
   Open your browser and go to: `http://localhost:3000`

## Usage

### 1. WhatsApp Authentication
- When you first start the server, a QR code will appear on the dashboard
- Scan the QR code with your WhatsApp mobile app
- Once authenticated, the dashboard will become available

### 2. Upload Contacts
- Prepare a CSV or Excel file with contact information
- Required columns: `number` (or `phone`/`mobile`) and `name`
- Example CSV format:
  ```csv
  name,number
  John Doe,1234567890
  Jane Smith,9876543210
  ```
- Upload the file using the dashboard

### 3. Compose Message
- Enter your message in the text area
- Use `{{name}}` placeholder for personalization
- Example: "Hello {{name}}, this is a test message!"

### 4. Upload Media (Optional)
- Upload images (JPG, PNG) or PDF files
- Maximum file size: 10MB
- Media will be sent along with your message

### 5. Configure Settings
- Set message delay (1-60 seconds between messages)
- Recommended: 5-10 seconds to avoid being blocked

### 6. Send Messages
- Click "Start Sending" to begin bulk messaging
- Monitor progress in real-time
- View detailed logs of success/failure

## File Structure

```
d:/mern/bulksender/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── README.md             # This file
├── public/               # Frontend files
│   ├── index.html        # Main dashboard
│   ├── styles.css        # Styling
│   └── script.js         # Frontend JavaScript
├── uploads/              # Temporary contact file storage
├── media/                # Temporary media file storage
├── logs/                 # Message logs (JSON format)
└── .wwebjs_auth/         # WhatsApp authentication data
```

## Contact File Format

### CSV Format
```csv
name,number
John Doe,1234567890
Jane Smith,+91 9876543210
Bob Wilson,91-9999888877
```

### Excel Format
| name      | number      |
|-----------|-------------|
| John Doe  | 1234567890  |
| Jane Smith| 9876543210  |

**Supported Column Names:**
- For numbers: `number`, `phone`, `mobile`, `Number`, `Phone`, `Mobile`
- For names: `name`, `Name`, `firstName`, `first_name`

## Message Placeholders

Use these placeholders in your messages for personalization:
- `{{name}}` - Contact's name
- Add more fields to your CSV/Excel and use them as `{{fieldname}}`

Example message:
```
Hello {{name}},

This is a personalized message just for you!

Best regards,
Your Company
```

## API Endpoints

- `GET /` - Main dashboard
- `GET /api/status` - Check WhatsApp connection status
- `POST /api/upload-contacts` - Upload contact file
- `POST /api/send-messages` - Start bulk messaging
- `GET /api/logs` - Get today's message logs

## Socket.io Events

### Client → Server
- `connection` - Client connects

### Server → Client
- `qr` - QR code for authentication
- `ready` - WhatsApp client ready
- `authenticated` - Authentication successful
- `auth_failure` - Authentication failed
- `disconnected` - WhatsApp disconnected
- `messageProgress` - Real-time sending progress
- `bulkComplete` - Bulk sending completed
- `bulkError` - Bulk sending error
- `messageLog` - Individual message log

## Logging

All messages are logged in JSON format in the `logs/` directory:
- File format: `messages-YYYY-MM-DD.json`
- Contains: timestamp, contact info, status, message, errors

## Security Notes

1. **Authentication**: WhatsApp session is stored locally in `.wwebjs_auth/`
2. **File Cleanup**: Uploaded files are automatically deleted after processing
3. **Rate Limiting**: Built-in delays prevent WhatsApp blocking
4. **Local Storage**: All data is stored locally on your server

## Troubleshooting

### WhatsApp Not Connecting
- Clear `.wwebjs_auth/` folder and restart
- Ensure stable internet connection
- Try scanning QR code again

### Messages Not Sending
- Check if numbers are valid WhatsApp numbers
- Verify message format and length
- Increase delay between messages

### File Upload Issues
- Ensure CSV/Excel has correct column names
- Check file size (max 10MB for media)
- Verify file format (.csv, .xlsx, .jpg, .png, .pdf)

### Performance Issues
- Reduce batch size for large contact lists
- Increase delay between messages
- Monitor server resources

## Dependencies

- **express**: Web server framework
- **whatsapp-web.js**: WhatsApp Web API
- **socket.io**: Real-time communication
- **multer**: File upload handling
- **xlsx**: Excel file processing
- **csv-parser**: CSV file processing
- **qrcode**: QR code generation
- **cors**: Cross-origin resource sharing

## Development

To run in development mode with auto-restart:
```bash
npm run dev
```

## Production Deployment

1. Install PM2 for process management:
   ```bash
   npm install -g pm2
   ```

2. Start with PM2:
   ```bash
   pm2 start server.js --name "whatsapp-bulk-sender"
   ```

3. Configure reverse proxy (nginx) if needed
4. Set up SSL certificate for HTTPS

## License

MIT License - Feel free to modify and distribute.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs in console
3. Check browser console for frontend errors
4. Ensure all dependencies are installed correctly

---

**Important**: This tool is for legitimate business use only. Respect WhatsApp's terms of service and avoid spamming. Always obtain proper consent before sending bulk messages.#   b u l k s e n d  
 