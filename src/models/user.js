const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            required: true,
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
            unique: true,
            required: true,
        },
    },
    {
        collection: 'users'
    }
)

UserSchema.index({ createdAt: 1, updatedAt: 1 });

module.exports = mongoose.model('User', UserSchema);