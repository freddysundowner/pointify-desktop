const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  roomProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  roomName: { type: String, required: true },
  guestName: { type: String, required: true },
  guestPhone: { type: String, default: "" },
  guestIdNumber: { type: String, default: "" },
  guestsCount: { type: Number, default: 1 },
  // "YYYY-MM-DD" strings. checkOut is EXCLUSIVE: a booking occupies the
  // nights [checkIn, checkOut), so back-to-back bookings are allowed
  // (one guest's check-out day = next guest's check-in day).
  checkIn: { type: String, required: true },
  checkOut: { type: String, required: true },
  nightlyRate: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["booked", "checked_in", "checked_out", "cancelled"],
    default: "booked",
  },
  notes: { type: String, default: "" },
  sync: { type: Boolean, default: false },
  createAt: {
    type: Date,
    default: Date.now,
  },
});

bookingSchema.index({ shop: 1, createAt: -1 });
bookingSchema.index({ roomProductId: 1, checkIn: 1, checkOut: 1 });

const markUnsyncedPlugin = require("../shared/markUnsynced.plugin");
bookingSchema.plugin(markUnsyncedPlugin);

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
