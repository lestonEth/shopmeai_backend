const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const connectDB = require("./config/database");
const errorHandler = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const childRoutes = require("./routes/childRoutes");
// const transactionRoutes = require("./routes/transactionRoutes");
// const productRoutes = require("./routes/productRoutes");
// const chatRoutes = require("./routes/chatRoutes");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json()); // Parse JSON requests

// Swagger Options with JWT Support
const swaggerOptions = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "Shopmeai API",
            version: "1.0.0",
            description: "API for kids allowance app",
            contact: {
                name: "Jimleston Osoi",
                email: "[email protected]",
            },
        },
        servers: [
            { url: "https://shopmeai-backend.onrender.com" }
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [{ BearerAuth: [] }],
    },
    apis: ["./src/routes/*.js"] // Define where Swagger should look for annotations
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/children", childRoutes);
// app.use("/api/transactions", transactionRoutes);
// app.use("/api/products", productRoutes);
// app.use("/api/chat", chatRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Error handling middleware
app.use(errorHandler);

module.exports = app;
