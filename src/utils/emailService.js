import nodemailer from 'nodemailer';

/**
 * Send OTP to user's email
 * @param {string} email 
 * @param {string} otp 
 */
export async function sendOTP(email, otp) {
  // DEV MODE ONLY: ALWAYS print the OTP clearly to the terminal for local testing
  console.log(`\n========================================`);
  console.log(`🔑 DEV OTP CODE FOR ${email}: ${otp}`);
  console.log(`========================================\n`);

  // Use Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // App Password
    },
  });

  const mailOptions = {
    from: `"Nexus Zero Trust" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Mã xác thực đăng nhập thiết bị',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg">
        <h2 style="color: #2563eb; text-align: center;">Nexus Zero Trust Security</h2>
        <p>Xin chào,</p>
        <p>Chúng tôi phát hiện bạn đang đăng nhập. Vui lòng sử dụng mã OTP dưới đây để hoàn tất quá trình xác thực:</p>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p>Mã này sẽ hết hạn sau 5 phút. Nếu bạn không thực hiện yêu cầu này, vui lòng đổi mật khẩu ngay lập tức.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 12px; color: #64748b; text-align: center;">
          Đây là email tự động, vui lòng không trả lời.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] OTP sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL_ERROR] Failed to send OTP to ${email}:`, error);
    return false;
  }
}

/**
 * Send a generic email (used for emergency alerts, honeytoken triggers, etc.)
 * @param {{ to: string; subject: string; html: string }} opts
 */
export async function sendEmail({ to, subject, html }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Nexus Zero Trust" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL_ERROR] Failed to send email to ${to}:`, error.message);
    return false;
  }
}
