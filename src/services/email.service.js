import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
      user: process.env.EMAIL_HOST_USER,
      pass: process.env.EMAIL_HOST_PASSWORD,
  },
});

export const sendMail = async (toEmail, otp) => {
  const mailOptions = {
      from: process.env.EMAIL_HOST_USER,
      to: toEmail,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('OTP sent to:', toEmail);
  } catch (error) {
    console.error('Failed to send mail:', error.message);
  }
};