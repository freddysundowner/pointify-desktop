const express = require("express");
const router = express.Router();
const {
  createBooking,
  getAllBookings,
  checkoutBooking,
  updateBookingById,
  deleteBookingById,
} = require("../controllers/booking");

router.post("/", createBooking);
router.get("/", getAllBookings);
router.post("/:id/checkout", checkoutBooking);
router.put("/:id", updateBookingById);
router.delete("/:id", deleteBookingById);

module.exports = router;
