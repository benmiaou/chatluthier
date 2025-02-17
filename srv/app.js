const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const soundRoutes = require('./routes/soundRoutes');
const requestRoutes = require('./routes/requestRoutes');

const app = express();

app.use(cookieParser());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    next();
});

app.use(authRoutes);
app.use(soundRoutes);
app.use(requestRoutes);

module.exports = app;
