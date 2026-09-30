const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST,
  port:   Number(process.env.MAIL_PORT),
  secure: process.env.MAIL_PORT === '465', 
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

if (process.env.NODE_ENV === 'production') {
  transporter.verify((err) => {
    if (err) console.error('Mailer connection error:', err);
    else console.log('Mailer ready');
  });
}

module.exports = transporter;
