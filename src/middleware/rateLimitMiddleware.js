/**
 * Rate limiting middleware for API requests
 * This provides a more general rate limiting solution than the one in amazonService.js
 */

const rateLimit = require("express-rate-limit")
const redis = require("redis")

// Try to use Redis for distributed rate limiting if available
let redisClient
try {
    redisClient = redis.createClient(process.env.REDIS_URL)
    redisClient.on("error", (err) => {
        console.error("Redis error:", err)
        redisClient = null
    })
} catch (error) {
    console.warn("Redis not available for rate limiting, using memory store")
    redisClient = null
}

// Create a general API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        success: false,
        message: "Too many requests, please try again later.",
    },
    // Redis store is configured separately below if available
})

// Create a more strict limiter for Amazon API related endpoints
const amazonApiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many Amazon API requests, please try again later.",
    },
    // Redis store is configured separately below if available
})

// Configure Redis store if Redis client is available
// This approach avoids the need for the separate RedisStore package
if (redisClient) {
    try {
        // Set up a simple in-memory store that mimics the Redis store interface
        const inMemoryStore = {
            incr: (key, cb) => {
                redisClient.incr(key, (err, result) => {
                    if (err) {
                        console.error("Redis incr error:", err)
                        return cb(err)
                    }
                    // Set expiration for the key if it's new
                    if (result === 1) {
                        redisClient.expire(key, Math.ceil(apiLimiter.windowMs / 1000))
                    }
                    cb(null, result)
                })
            },
            decrement: (key) => {
                redisClient.decr(key, (err) => {
                    if (err) {
                        console.error("Redis decr error:", err)
                    }
                })
            },
            resetKey: (key) => {
                redisClient.del(key, (err) => {
                    if (err) {
                        console.error("Redis del error:", err)
                    }
                })
            },
        }

        // Apply the store to both limiters
        apiLimiter.store = inMemoryStore
        amazonApiLimiter.store = inMemoryStore

        console.log("Redis store configured for rate limiting")
    } catch (error) {
        console.error("Failed to configure Redis store for rate limiting:", error)
    }
}

module.exports = {
    apiLimiter,
    amazonApiLimiter,
}

