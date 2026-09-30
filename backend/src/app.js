require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const sequelize = require('./config/database');
const migrator = require('./migrator');
const logger = require('./config/logger');
const requestLogger = require('./middleware/requestLogger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

require('./models');

const authRoutes = require('./routes/auth');
const boardRoutes = require('./routes/boards');
const columnRoutes = require('./routes/columns');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,         // нужно для передачи cookie с refresh-токеном
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(requestLogger);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/boards/:boardId/columns', columnRoutes);
app.use('/api/boards/:boardId/columns/:columnId/tasks', taskRoutes);
app.use('/api/users', userRoutes);


app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Соединение с базой данных установлено');

    // Применяем миграции схемы (src/migrations). Отключить: AUTO_MIGRATE=false
    if (process.env.AUTO_MIGRATE !== 'false') {
      await migrator.up();
      logger.info('Схема базы данных актуальна');
    }

    app.listen(PORT, () => {
      logger.info(`Сервер стартанул на ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Не удалось запустить сервер:', err);
    process.exit(1);
  }
};

start();
