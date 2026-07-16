const mongoose = require("mongoose");

// Guest-house rooms are their OWN collection — NOT products/services.
const roomSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  name: { type: String, required: true },
  // Optional grouping, e.g. "Property 1", "House A", "Floor 2"
  group: { type: String, default: "" },
  nightlyRate: { type: Number, required: true, min: 0 },
  sync: { type: Boolean, default: false },
  createAt: {
    type: Date,
    default: Date.now,
  },
});

roomSchema.index({ shop: 1, name: 1 });

const markUnsyncedPlugin = require("../shared/markUnsynced.plugin");
roomSchema.plugin(markUnsyncedPlugin);

const Room = mongoose.model("Room", roomSchema);

module.exports = Room;
