const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUser:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:     { type: String, enum: ['message', 'like', 'comment', 'follow', 'unfollow'], required: true },
  weight:   { type: Number, min: 0, max: 1, default: 0.5 },
  metadata: { type: Object, default: {} },
}, { timestamps: true });

activitySchema.index({ fromUser: 1, toUser: 1 });
activitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
