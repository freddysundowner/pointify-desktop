const Booking = require("../models/booking");

// A room is double-booked if another active booking for the same room
// overlaps the requested range. checkOut is exclusive, so the overlap
// test is: existing.checkIn < new.checkOut AND existing.checkOut > new.checkIn
const findConflict = async (roomId, checkIn, checkOut, excludeId) => {
  const filter = {
    roomId,
    status: { $in: ["booked", "checked_in"] },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  return Booking.findOne(filter);
};

const createBooking = async (req, res) => {
  try {
    const { shop, roomId, roomName, guestName, checkIn, checkOut } = req.body;

    if (!shop || !roomId || !roomName || !guestName || !checkIn || !checkOut) {
      return res.status(400).json({ error: "Missing required booking fields" });
    }
    if (String(checkOut) <= String(checkIn)) {
      return res.status(400).json({ error: "Check-out must be after check-in" });
    }

    const conflict = await findConflict(roomId, checkIn, checkOut);
    if (conflict) {
      return res.status(409).json({
        error: "Room is already booked for those dates",
        conflict: {
          _id: conflict._id,
          guestName: conflict.guestName,
          checkIn: conflict.checkIn,
          checkOut: conflict.checkOut,
        },
      });
    }

    // Never trust payment fields on create — payment happens at check-out.
    const body = { ...req.body };
    delete body.paymentMethod;
    delete body.amountPaid;
    delete body.mpesaCode;
    delete body.paidAt;

    const booking = new Booking(body);
    await booking.save();

    // Race guard: two requests can both pass the pre-check above at the same
    // moment. After saving, re-check; if another ACTIVE booking overlaps and
    // was created before ours (smaller _id), remove ours and report 409.
    const postConflict = await findConflict(roomId, checkIn, checkOut, booking._id);
    if (postConflict && String(postConflict._id) < String(booking._id)) {
      await Booking.findByIdAndDelete(booking._id);
      return res.status(409).json({
        error: "Room is already booked for those dates",
        conflict: {
          _id: postConflict._id,
          guestName: postConflict.guestName,
          checkIn: postConflict.checkIn,
          checkOut: postConflict.checkOut,
        },
      });
    }

    res.status(201).json(booking);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const { shop, from, to } = req.query;
    if (!shop) {
      return res.status(400).json({ error: "shop query param is required" });
    }
    const filter = { shop };
    // Optional date-range filter (bookings that touch the range)
    if (from && to) {
      filter.checkIn = { $lt: to };
      filter.checkOut = { $gt: from };
    }
    const bookings = await Booking.find(filter)
      .sort({ createAt: -1 })
      .limit(500);
    res.status(200).json(bookings);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ATOMIC check-out + payment. Body:
//   { paymentMethod: "cash" | "mpesa" | "none", amountPaid: Number, mpesaCode: String }
// Sets status = "checked_out" and stores the payment on the booking in ONE
// conditional update. IDEMPOTENT: if the booking is already checked out, the
// stored payment is NOT overwritten and the existing document is returned —
// a client retry can never double-charge or change the recorded amount.
const checkoutBooking = async (req, res) => {
  const { id } = req.params;
  try {
    const method = req.body.paymentMethod;
    if (!["cash", "mpesa", "none"].includes(method)) {
      return res.status(400).json({ error: "paymentMethod must be cash, mpesa or none" });
    }
    const amount = method === "none" ? 0 : Number(req.body.amountPaid);
    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ error: "amountPaid must be a number >= 0" });
    }
    if (method === "mpesa" && !String(req.body.mpesaCode || "").trim()) {
      return res.status(400).json({ error: "mpesaCode is required for M-Pesa payments" });
    }

    // Conditional update: only transitions from an active status. If two
    // requests race, exactly one matches; the other falls through to the
    // idempotent read below.
    const updated = await Booking.findOneAndUpdate(
      { _id: id, status: { $in: ["booked", "checked_in"] } },
      {
        $set: {
          status: "checked_out",
          paymentMethod: method,
          amountPaid: amount,
          mpesaCode: method === "mpesa" ? String(req.body.mpesaCode).trim() : "",
          paidAt: method === "none" ? null : new Date(),
        },
      },
      { new: true }
    );
    if (updated) {
      return res.status(200).json(updated);
    }

    const existing = await Booking.findById(id);
    if (!existing) {
      return res.status(404).json({ error: "Booking not found" });
    }
    if (existing.status === "checked_out") {
      // Already checked out — return as-is, do NOT overwrite the payment.
      return res.status(200).json(existing);
    }
    return res.status(409).json({
      error: `Booking is ${existing.status} and cannot be checked out`,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateBookingById = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await Booking.findById(id);
    if (!existing) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Payment fields may only be written by the checkout endpoint.
    const body = { ...req.body };
    delete body.paymentMethod;
    delete body.amountPaid;
    delete body.mpesaCode;
    delete body.paidAt;

    const next = { ...existing.toObject(), ...body };

    if (String(next.checkOut) <= String(next.checkIn)) {
      return res.status(400).json({ error: "Check-out must be after check-in" });
    }

    // Re-check overlap if the booking stays active and dates/room may have changed
    if (next.status === "booked" || next.status === "checked_in") {
      const conflict = await findConflict(next.roomId, next.checkIn, next.checkOut, id);
      if (conflict) {
        return res.status(409).json({
          error: "Room is already booked for those dates",
          conflict: {
            _id: conflict._id,
            guestName: conflict.guestName,
            checkIn: conflict.checkIn,
            checkOut: conflict.checkOut,
          },
        });
      }
    }

    const updatedBooking = await Booking.findByIdAndUpdate(id, body, {
      new: true,
    });
    res.status(200).json(updatedBooking);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteBookingById = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Booking.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.status(200).json({ success: true, message: "Booking deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  checkoutBooking,
  updateBookingById,
  deleteBookingById,
};
