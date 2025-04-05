const mongoose = require("mongoose")

const AmazonCacheSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        expires: {
            type: Date,
            required: true,
            index: { expires: 0 }, // This will automatically remove documents when they expire
        },
    },
    { timestamps: true },
)

// Create indexes for better performance
AmazonCacheSchema.index({ key: 1 })
AmazonCacheSchema.index({ expires: 1 })

module.exports = mongoose.model("AmazonCache", AmazonCacheSchema)

