const pool = require("./db/db");
const express = require("express");
const cors = require("cors"); 
const routes = require("../routes/index");
const redisClient = require("./redis");

// const passport = require("./passport");

const app = express();

redisClient.connect()
  .then(async () => {
    console.log("Redis connected");
  })
  .catch(console.error);

// enable CORS - Cross Origin Resource Sharing
app.use(
    cors({
        exposedHeaders: ["Content-Disposition"],
    })
);

app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.status(200).json({message : result.rows});
    } catch (error) {
        res.status(400).json({ message: error });
    }
})

app.use((req, res, next) => {
    // Create the RequestLog document
    let payload = {
        url: req.baseUrl + req.path,
        method: req.method,
    };

    payload.method !== "OPTIONS" && console.log(payload);
    next();
})

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// app.use(passport.initialize());

//API router
app.use("/api", routes);

// Invalid Route
app.all(/^\/api\/.*/, (req, res) => {
    res.status(404).json({ message: 'API not found' });
});

// error handler
app.use((err, req, res, next) => {
    if (err.isJoi) {
        err.message = err.details.map((e) => e.message).join("; ");
        err.status = 400;
    }

    console.log("Line", err);
    res.status(400).json({ message: err });
});

module.exports = app;
