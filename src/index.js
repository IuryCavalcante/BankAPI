import express from 'express';
import winston from 'winston';
import mongoose from 'mongoose';

import accountRouter from './routes/accountRouter.js';

const { combine, timestamp, label, printf } = winston.format;
const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});
global.logger = winston.createLogger({
  level: 'silly',
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'bank-api.log' }),
  ],
  format: combine(label({ label: 'bank-api' }), timestamp(), myFormat),
});

mongoose
  .connect(
    'mongodb+srv://admin:<password>@clusterigti.rcfnh.gcp.mongodb.net/<database>?retryWrites=true&w=majority',
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(console.log('ok'))
  .catch((err) => {
    console.log('ok');
  });

const app = express();

app.use(express.json());
app.use('/account', accountRouter);

app.listen(3000, async () => {
  global.logger.info('API Started');
});
