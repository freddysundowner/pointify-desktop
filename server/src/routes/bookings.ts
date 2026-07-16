import type { Express, Request, Response } from "express";
import { Pool } from "pg";

// Bookings and the guest-house flag are stored in this project's own
// PostgreSQL database (the main Pointify backend has no booking endpoints).
let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

const BOOKING_STATUSES = ["booked", "checked_in", "checked_out", "cancelled"];

function bookingRow(r: any) {
  return {
    id: r.id,
    shopId: r.shop_id,
    roomProductId: r.room_product_id,
    roomName: r.room_name,
    guestName: r.guest_name,
    guestPhone: r.guest_phone,
    guestIdNumber: r.guest_id_number,
    guestsCount: r.guests_count,
    checkIn: r.check_in instanceof Date ? r.check_in.toISOString().slice(0, 10) : r.check_in,
    checkOut: r.check_out instanceof Date ? r.check_out.toISOString().slice(0, 10) : r.check_out,
    nightlyRate: Number(r.nightly_rate),
    totalAmount: Number(r.total_amount),
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

const isDateStr = (v: any) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function registerBookingRoutes(app: Express) {
  // ---- Guest house flag per shop ----
  app.get("/api/guesthouse/:shopId", async (req: Request, res: Response) => {
    try {
      const { rows } = await getPool().query(
        "SELECT enabled FROM guest_house_settings WHERE shop_id = $1",
        [req.params.shopId]
      );
      res.json({ shopId: req.params.shopId, enabled: rows[0]?.enabled ?? false });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to load guest house setting" });
    }
  });

  app.put("/api/guesthouse/:shopId", async (req: Request, res: Response) => {
    try {
      const enabled = !!req.body?.enabled;
      await getPool().query(
        `INSERT INTO guest_house_settings (shop_id, enabled, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (shop_id) DO UPDATE SET enabled = $2, updated_at = now()`,
        [req.params.shopId, enabled]
      );
      res.json({ shopId: req.params.shopId, enabled });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to save guest house setting" });
    }
  });

  // ---- Bookings ----
  app.get("/api/bookings", async (req: Request, res: Response) => {
    try {
      const shopId = String(req.query.shopId || "");
      if (!shopId) return res.status(400).json({ error: "shopId is required" });
      const params: any[] = [shopId];
      let where = "shop_id = $1";
      // Optional month window: from/to (inclusive overlap)
      if (isDateStr(req.query.from) && isDateStr(req.query.to)) {
        params.push(req.query.from, req.query.to);
        where += " AND check_in <= $3 AND check_out >= $2";
      }
      const { rows } = await getPool().query(
        `SELECT * FROM bookings WHERE ${where} ORDER BY check_in DESC, id DESC LIMIT 500`,
        params
      );
      res.json(rows.map(bookingRow));
    } catch (e: any) {
      res.status(500).json({ error: "Failed to load bookings" });
    }
  });

  app.post("/api/bookings", async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      const required = ["shopId", "roomProductId", "roomName", "guestName", "checkIn", "checkOut"];
      for (const f of required) {
        if (!b[f]) return res.status(400).json({ error: `${f} is required` });
      }
      if (!isDateStr(b.checkIn) || !isDateStr(b.checkOut)) {
        return res.status(400).json({ error: "checkIn/checkOut must be YYYY-MM-DD" });
      }
      if (b.checkOut <= b.checkIn) {
        return res.status(400).json({ error: "Check-out must be after check-in" });
      }
      // Conflict check: same room, overlapping nights, active bookings.
      // A stay occupies nights [checkIn, checkOut); back-to-back bookings are OK.
      const conflict = await getPool().query(
        `SELECT id, guest_name, check_in, check_out FROM bookings
         WHERE room_product_id = $1 AND shop_id = $2
           AND status IN ('booked','checked_in')
           AND check_in < $4 AND check_out > $3
         LIMIT 1`,
        [b.roomProductId, b.shopId, b.checkIn, b.checkOut]
      );
      if (conflict.rows.length > 0) {
        const c = bookingRow(conflict.rows[0]);
        return res.status(409).json({
          error: `Room is already booked ${c.checkIn} to ${c.checkOut} (${conflict.rows[0].guest_name})`,
        });
      }
      const nights = Math.round(
        (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000
      );
      const nightlyRate = Number(b.nightlyRate) || 0;
      const totalAmount = b.totalAmount != null ? Number(b.totalAmount) : nightlyRate * nights;
      const { rows } = await getPool().query(
        `INSERT INTO bookings
         (shop_id, room_product_id, room_name, guest_name, guest_phone, guest_id_number,
          guests_count, check_in, check_out, nightly_rate, total_amount, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'booked',$12)
         RETURNING *`,
        [
          b.shopId, b.roomProductId, b.roomName, b.guestName,
          b.guestPhone || "", b.guestIdNumber || "",
          Math.max(1, Number(b.guestsCount) || 1),
          b.checkIn, b.checkOut, nightlyRate, totalAmount, b.notes || "",
        ]
      );
      res.status(201).json(bookingRow(rows[0]));
    } catch (e: any) {
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // Update status (check-in / check-out / cancel) or edit details
  app.put("/api/bookings/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid booking id" });
      const b = req.body || {};
      const { rows: existingRows } = await getPool().query("SELECT * FROM bookings WHERE id = $1", [id]);
      if (existingRows.length === 0) return res.status(404).json({ error: "Booking not found" });
      const existing = existingRows[0];

      const status = b.status ?? existing.status;
      if (!BOOKING_STATUSES.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const checkIn = b.checkIn ?? (existing.check_in instanceof Date ? existing.check_in.toISOString().slice(0, 10) : existing.check_in);
      const checkOut = b.checkOut ?? (existing.check_out instanceof Date ? existing.check_out.toISOString().slice(0, 10) : existing.check_out);
      if (!isDateStr(checkIn) || !isDateStr(checkOut) || checkOut <= checkIn) {
        return res.status(400).json({ error: "Check-out must be after check-in" });
      }
      // Re-check conflicts if dates/room changed and booking stays active
      if (["booked", "checked_in"].includes(status)) {
        const roomId = b.roomProductId ?? existing.room_product_id;
        const conflict = await getPool().query(
          `SELECT id FROM bookings
           WHERE room_product_id = $1 AND shop_id = $2 AND id <> $3
             AND status IN ('booked','checked_in')
             AND check_in < $5 AND check_out > $4
           LIMIT 1`,
          [roomId, existing.shop_id, id, checkIn, checkOut]
        );
        if (conflict.rows.length > 0) {
          return res.status(409).json({ error: "Room is already booked for those dates" });
        }
      }
      const nights = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
      const nightlyRate = b.nightlyRate != null ? Number(b.nightlyRate) : Number(existing.nightly_rate);
      const totalAmount = b.totalAmount != null ? Number(b.totalAmount) : nightlyRate * nights;
      const { rows } = await getPool().query(
        `UPDATE bookings SET
           room_product_id = $2, room_name = $3, guest_name = $4, guest_phone = $5,
           guest_id_number = $6, guests_count = $7, check_in = $8, check_out = $9,
           nightly_rate = $10, total_amount = $11, status = $12, notes = $13
         WHERE id = $1 RETURNING *`,
        [
          id,
          b.roomProductId ?? existing.room_product_id,
          b.roomName ?? existing.room_name,
          b.guestName ?? existing.guest_name,
          b.guestPhone ?? existing.guest_phone,
          b.guestIdNumber ?? existing.guest_id_number,
          Math.max(1, Number(b.guestsCount ?? existing.guests_count) || 1),
          checkIn, checkOut, nightlyRate, totalAmount, status,
          b.notes ?? existing.notes,
        ]
      );
      res.json(bookingRow(rows[0]));
    } catch (e: any) {
      res.status(500).json({ error: "Failed to update booking" });
    }
  });

  app.delete("/api/bookings/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid booking id" });
      const { rowCount } = await getPool().query("DELETE FROM bookings WHERE id = $1", [id]);
      if (rowCount === 0) return res.status(404).json({ error: "Booking not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to delete booking" });
    }
  });
}
