# Quick Setup Guide

## 🚀 Getting Started

### 1. Start the Server
```bash
npm start
```
Or double-click `start.bat` on Windows

### 2. Open Dashboard
Open your browser and go to: **http://localhost:3000**

### 3. Connect WhatsApp
- Scan the QR code with your WhatsApp mobile app
- Go to WhatsApp > Settings > Linked Devices > Link a Device
- Scan the QR code displayed on the dashboard

### 4. Upload Contacts
- Prepare a CSV or Excel file with columns: `name`, `number`
- Upload the file using the dashboard

### 5. Send Messages
- Enter your message (use {{name}} for personalization)
- Optionally upload media files
- Set delay between messages (recommended: 5-10 seconds)
- Click "Start Sending"

## 📁 Sample Contact File Format

Create a CSV file like this:
```csv
name,number
John Doe,1234567890
Jane Smith,9876543210
Bob Wilson,5555666777
```

## 🔧 Troubleshooting

### Server Won't Start
```bash
npm install
npm start
```

### WhatsApp Won't Connect
1. Delete `.wwebjs_auth` folder
2. Restart server
3. Scan QR code again

### Messages Not Sending
- Check if numbers are valid WhatsApp numbers
- Increase delay between messages
- Ensure stable internet connection

## 📱 Mobile Usage

The dashboard is fully mobile-optimized! You can:
- Access from your phone browser
- Upload files from your phone
- Monitor progress in real-time
- All while the backend runs on your computer

## 🛡️ Important Notes

- **Legitimate Use Only**: Only send messages to people who have consented
- **Rate Limiting**: Use appropriate delays to avoid being blocked
- **Data Privacy**: All data is stored locally on your machine
- **WhatsApp ToS**: Respect WhatsApp's terms of service

## 📊 Features

✅ Mobile-optimized dashboard  
✅ CSV/Excel contact upload  
✅ Message personalization with {{name}}  
✅ Media attachment support (images, PDFs)  
✅ Real-time progress tracking  
✅ Comprehensive logging  
✅ Drag & drop file uploads  
✅ Automatic file cleanup  

---

**Ready to send your first bulk message? Start the server and visit http://localhost:3000!**