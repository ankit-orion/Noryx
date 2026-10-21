import express from 'express'
import cors from 'cors'

const app = express();

// Basic configuration
app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static('public'));

// cors conifiguration
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || "http://localhost:5173",
    methods: ['GET', 'POST', 'PUT', 'DELETE', "OPTIONS", "PATCH"],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// import the routes
import healthCheckRouter from './routes/healthCheck.routes.js';

app.use('/api/v1/healthCheck', healthCheckRouter)

app.get('/', (req, res) => {
    res.send('Hello World!')
})
export default app;