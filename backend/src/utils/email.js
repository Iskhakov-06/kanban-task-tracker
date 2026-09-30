'use strict';

const transporter = require('../config/mailer');

const FROM = process.env.MAIL_FROM || 'Task Tracker <noreply@tasktracker.dev>';
const BASE = process.env.CLIENT_URL || 'http://localhost:5000';

/**
 * Письмо с подтверждением email после регистрации
 */
const sendVerificationEmail = async (to, username, token) => {
  const link = `${BASE}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Подтвердите ваш email — Task Tracker',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Привет, ${username}!</h2>
        <p>Спасибо за регистрацию. Нажмите кнопку ниже, чтобы подтвердить email:</p>
        <a href="${link}"
           style="display:inline-block;padding:12px 24px;background:#0079BF;
                  color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
          Подтвердить email
        </a>
        <p style="margin-top:16px;color:#666;font-size:13px">
          Ссылка действительна 24 часа.<br>
          Если вы не регистрировались — просто проигнорируйте это письмо.
        </p>
      </div>
    `,
  });
};

/**
 * Письмо для сброса пароля
 */
const sendPasswordResetEmail = async (to, username, token) => {
  const link = `${BASE}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Сброс пароля — Task Tracker',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Сброс пароля</h2>
        <p>Привет, ${username}! Мы получили запрос на сброс пароля для вашего аккаунта.</p>
        <a href="${link}"
           style="display:inline-block;padding:12px 24px;background:#E53E3E;
                  color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
          Сбросить пароль
        </a>
        <p style="margin-top:16px;color:#666;font-size:13px">
          Ссылка действительна 1 час.<br>
          Если вы не запрашивали сброс — просто проигнорируйте это письмо.
        </p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
