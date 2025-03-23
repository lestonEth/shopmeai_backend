const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    image_url: { type: String, required: true },
    amazon_link: { type: String, required: true }
});

module.exports = mongoose.model('Product', ProductSchema);
