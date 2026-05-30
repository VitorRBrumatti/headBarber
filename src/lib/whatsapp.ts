import fs from 'fs'
import path from 'path'

/**
 * Decoupled helper to send WhatsApp notifications.
 * For the MVP, it writes to a local log file scratch/whatsapp_logs.txt
 * and logs to the console. Easily replaceable with a real API client later.
 */
export async function sendWhatsAppNotification(phone: string, message: string) {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] TO: ${phone}\nMESSAGE:\n${message}\n----------------------------------------\n`

  console.log(`[WhatsApp Mock] Sending message to ${phone}:\n${message}`)

  try {
    // Ensure scratch directory exists under workspace root (C:\Projects\headBarber\scratch)
    const scratchDir = path.join(process.cwd(), 'scratch')
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true })
    }

    const logPath = path.join(scratchDir, 'whatsapp_logs.txt')
    fs.appendFileSync(logPath, logEntry, 'utf8')
  } catch (error) {
    console.error('[WhatsApp Mock] Failed to write WhatsApp log to disk:', error)
  }
}
