const express = require('express');

require('dotenv').config();
const cookieParser = require('cookie-parser');

const { port } = require('./config/server.config');
const apiRouter = require('./routes');

const app = express();

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// /api
app.use('/api', apiRouter)


const PORT = port;

app.listen(PORT, () => {
  console.log(`server listening to port: ${PORT}`)
})