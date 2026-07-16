const express = require("express");
const router = express.Router();
const {
  createBooking,
  getAllBookings,
  updateBookingById,
  deleteBookingById,
} = require("../controllers/booking");

router.post("/", createBooking);
router.get("/", getAllBookings);
router.put("/:id", updateBookingById);
router.delete("/:id", deleteBookingById);

module.exports = router;
