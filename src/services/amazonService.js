// services/amazonService.js
const SellingPartnerAPI = require("amazon-sp-api")
const { promisify } = require("util")
const redis = require("redis")
const Product = require("../models/Product")

// Configure Redis client for caching if available
let redisClient
let getAsync
let setexAsync

try {
    redisClient = redis.createClient(process.env.REDIS_URL)
    getAsync = promisify(redisClient.get).bind(redisClient)
    setexAsync = promisify(redisClient.setex).bind(redisClient)

    redisClient.on("error", (err) => {
        console.error("Redis error:", err)
        // Continue without caching if Redis fails
        redisClient = null
    })
} catch (error) {
    console.warn("Redis not available, continuing without caching")
    redisClient = null
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 5 // Maximum 5 requests per minute
const requestTimestamps = []

// Check if we're being rate limited
const checkRateLimit = () => {
    const now = Date.now()
    // Remove timestamps older than the window
    while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW) {
        requestTimestamps.shift()
    }

    // Check if we've hit the limit
    if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        const oldestTimestamp = requestTimestamps[0]
        const resetTime = oldestTimestamp + RATE_LIMIT_WINDOW - now
        throw new Error(`Rate limit exceeded. Try again in ${ Math.ceil(resetTime / 1000) } seconds.`)
    }

    // Add current timestamp
    requestTimestamps.push(now)
    return true
}

// Initialize Amazon SP API client
const getSpApiClient = async () => {
    try {
        return new SellingPartnerAPI({
            region: process.env.AWS_REGION || "us-east-1",
            refresh_token: process.env.VITE_SPAPI_REFRESH_TOKEN,
            credentials: {
                SELLING_PARTNER_APP_CLIENT_ID: process.env.AWS_ACCESS_KEY,
                SELLING_PARTNER_APP_CLIENT_SECRET: process.env.AWS_SECRET_KEY,
                AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY,
                AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_KEY,
                AWS_SELLING_PARTNER_ROLE: process.env.AWS_ROLE,
            },
        })
    } catch (error) {
        console.error("Error initializing Amazon SP API client:", error)
        throw new Error("Failed to initialize Amazon API client")
    }
}

/**
 * Search for Amazon products with various parameters
 * @param {Object} params - Search parameters
 * @param {string} params.keywords - Search keywords
 * @param {string} params.category - Product category
 * @param {number} params.minPrice - Minimum price
 * @param {number} params.maxPrice - Maximum price
 * @param {number} params.limit - Maximum number of results (default: 10)
 * @returns {Promise<Array>} - Array of product objects
 */
const searchAmazonProducts = async (params = {}) => {
    const { keywords, category, minPrice, maxPrice, limit = 10, page = 1 } = params

    try {
        // Check rate limiting
        checkRateLimit()

        // Generate cache key based on search parameters
        const cacheKey = `amazon_search:${ JSON.stringify(params) }`

        // Try to get from cache first
        if (redisClient) {
            const cachedResults = await getAsync(cacheKey)
            if (cachedResults) {
                return JSON.parse(cachedResults)
            }
        }

        // Initialize SP API client
        const sellingPartner = await getSpApiClient()

        // Build query parameters
        const queryParams = {
            keywords: keywords || "",
            itemPage: page,
            resources: [
                "itemInfo.title",
                "offers.listings.price",
                "images.primary.medium",
                "itemInfo.features",
                "itemInfo.productInfo",
                "itemInfo.byLineInfo",
            ],
        }

        // Add category if provided
        if (category) {
            queryParams.browseNodeId = category
        }

        // Add price filters if provided
        if (minPrice || maxPrice) {
            queryParams.priceFilter = {}
            if (minPrice) queryParams.priceFilter.min = minPrice
            if (maxPrice) queryParams.priceFilter.max = maxPrice
        }

        // Make API call to Amazon
        const response = await sellingPartner.callAPI({
            operation: "searchCatalogItems",
            query: queryParams,
        })

        // Process and format the results
        let products = []

        if (response && response.items) {
            products = response.items.slice(0, limit).map((item) => {
                // Extract relevant product information
                const product = {
                    asin: item.asin,
                    name: item.itemInfo?.title?.displayValue || "Unknown Product",
                    category: item.itemInfo?.classifications?.productGroup?.displayValue || "",
                    price: item.offers?.listings?.[0]?.price?.amount || 0,
                    currency: item.offers?.listings?.[0]?.price?.currency || "USD",
                    image_url: item.images?.primary?.medium?.url || "",
                    amazon_link: `https://www.amazon.com/dp/${ item.asin }`,
                    features: item.itemInfo?.features?.displayValues || [],
                    brand: item.itemInfo?.byLineInfo?.brand?.displayValue || "Unknown Brand",
                }

                return product
            })

            // Cache the results
            if (redisClient) {
                await setexAsync(cacheKey, 3600, JSON.stringify(products)) // Cache for 1 hour
            }

            // Optionally save to database for analytics or future reference
            try {
                await Promise.all(
                    products.map(async (product) => {
                        await Product.findOneAndUpdate({ asin: product.asin }, product, { upsert: true, new: true })
                    }),
                )
            } catch (dbError) {
                console.error("Error saving products to database:", dbError)
                // Continue even if database save fails
            }
        }

        return products
    } catch (error) {
        console.error("Error searching Amazon products:", error)

        // Handle specific error types
        if (error.message.includes("Rate limit exceeded")) {
            throw error // Rethrow rate limit errors
        } else if (error.statusCode === 401 || error.statusCode === 403) {
            throw new Error("Authentication error with Amazon API. Please check your credentials.")
        } else if (error.statusCode === 404) {
            return [] // No products found, return empty array
        } else {
            throw new Error("Failed to search Amazon products. Please try again later.")
        }
    }
}

/**
 * Get product details by ASIN
 * @param {string} asin - Amazon Standard Identification Number
 * @returns {Promise<Object>} - Product details
 */
const getProductDetails = async (asin) => {
    if (!asin) {
        throw new Error("ASIN is required")
    }

    try {
        // Check rate limiting
        checkRateLimit()

        // Generate cache key
        const cacheKey = `amazon_product:${ asin }`

        // Try to get from cache first
        if (redisClient) {
            const cachedProduct = await getAsync(cacheKey)
            if (cachedProduct) {
                return JSON.parse(cachedProduct)
            }
        }

        // Try to get from database first
        const dbProduct = await Product.findOne({ asin })
        if (dbProduct) {
            return dbProduct
        }

        // Initialize SP API client
        const sellingPartner = await getSpApiClient()

        // Make API call to Amazon
        const response = await sellingPartner.callAPI({
            operation: "getCatalogItem",
            path: {
                asin,
            },
            query: {
                resources: [
                    "itemInfo.title",
                    "offers.listings.price",
                    "images.primary.medium",
                    "images.variants.medium",
                    "itemInfo.features",
                    "itemInfo.productInfo",
                    "itemInfo.byLineInfo",
                    "itemInfo.contentInfo",
                    "itemInfo.externalIds",
                ],
            },
        })

        if (!response || !response.item) {
            throw new Error("Product not found")
        }

        const item = response.item

        // Format product details
        const product = {
            asin: item.asin,
            name: item.itemInfo?.title?.displayValue || "Unknown Product",
            category: item.itemInfo?.classifications?.productGroup?.displayValue || "",
            price: item.offers?.listings?.[0]?.price?.amount || 0,
            currency: item.offers?.listings?.[0]?.price?.currency || "USD",
            image_url: item.images?.primary?.medium?.url || "",
            additional_images: item.images?.variants?.map((img) => img.medium.url) || [],
            amazon_link: `https://www.amazon.com/dp/${ item.asin }`,
            features: item.itemInfo?.features?.displayValues || [],
            description: item.itemInfo?.productInfo?.description?.displayValue || "",
            brand: item.itemInfo?.byLineInfo?.brand?.displayValue || "Unknown Brand",
            manufacturer: item.itemInfo?.byLineInfo?.manufacturer?.displayValue || "",
        }

        // Cache the result
        if (redisClient) {
            await setexAsync(cacheKey, 86400, JSON.stringify(product)) // Cache for 24 hours
        }

        // Save to database
        try {
            await Product.findOneAndUpdate({ asin: product.asin }, product, { upsert: true, new: true })
        } catch (dbError) {
            console.error("Error saving product to database:", dbError)
            // Continue even if database save fails
        }

        return product
    } catch (error) {
        console.error("Error getting product details:", error)

        // Handle specific error types
        if (error.message.includes("Rate limit exceeded")) {
            throw error // Rethrow rate limit errors
        } else if (error.statusCode === 401 || error.statusCode === 403) {
            throw new Error("Authentication error with Amazon API. Please check your credentials.")
        } else if (error.statusCode === 404 || error.message === "Product not found") {
            throw new Error("Product not found")
        } else {
            throw new Error("Failed to get product details. Please try again later.")
        }
    }
}

/**
 * Get popular products by category
 * @param {string} category - Product category
 * @param {number} limit - Maximum number of results (default: 10)
 * @returns {Promise<Array>} - Array of product objects
 */
const getPopularProducts = async (category, limit = 10) => {
    try {
        return await searchAmazonProducts({
            category,
            limit,
            // Sort by popularity (implementation depends on Amazon API capabilities)
        })
    } catch (error) {
        console.error("Error getting popular products:", error)
        throw error
    }
}

/**
 * Get recommended products for a child based on age and preferences
 * @param {Object} child - Child object
 * @param {number} limit - Maximum number of results (default: 10)
 * @returns {Promise<Array>} - Array of product objects
 */
const getRecommendedProducts = async (child, limit = 10) => {
    try {
        // Implement recommendation logic based on child's age and preferences
        // This is a simplified example
        const ageAppropriateCategory = child.age < 10 ? "toys" : "electronics"

        return await searchAmazonProducts({
            category: ageAppropriateCategory,
            limit,
        })
    } catch (error) {
        console.error("Error getting recommended products:", error)
        throw error
    }
}

module.exports = {
    searchAmazonProducts,
    getProductDetails,
    getPopularProducts,
    getRecommendedProducts,
}

