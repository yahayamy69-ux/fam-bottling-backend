import Contact from '../models/Contact.js';
import nodemailer from 'nodemailer';

const sendEmail = async ({ fromName, fromEmail, subject, message }) => {
  // Recipient default
  const to = process.env.TIMELESS_EMAIL || 'timelessbyemjay@gmail.com';

  // If SMTP config provided, attempt to send email
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: subject || 'Contact Form Message',
      text: message,
      html: `<p><strong>From:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
             <p><strong>Subject:</strong> ${subject || 'Contact Form'}</p>
             <p>${message}</p>`
    });

    return info;
  }

  // If no SMTP configured, do nothing (email not sent)
  return null;
};

export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email and message are required' });
    }

    // Save to DB
    const contact = await Contact.create({ name, email, subject, message });

    // Attempt to send email
    try {
      const info = await sendEmail({ fromName: name, fromEmail: email, subject, message });
      if (info) {
        console.log('Contact email sent:', info.messageId || info.response);
      } else {
        console.log('SMTP not configured - email not sent, contact saved to DB');
      }
    } catch (err) {
      console.error('Failed to send contact email:', err.message);
    }

    res.status(201).json({ message: 'Contact submitted successfully' });
  } catch (err) {
    console.error('Contact submit error:', err.message);
    res.status(500).json({ message: 'Failed to submit contact' });
  }
};
