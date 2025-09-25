import { Router } from "express";
import {
  checkAvailability,
  createBooking,
  getBookingById,
  getAllBookings,
  getMyBookings,
  getMyFieldBookings,
  updateBooking,
  deleteBooking
} from "../controller/booking.controller";

const router = Router();

// CRUD + Extra Routes
router.post("/availability", checkAvailability);
router.post("/create", createBooking);
router.get("/:id", getBookingById);
router.get("/", getAllBookings);
router.get("/me/all", getMyBookings);
router.get("/me/fields", getMyFieldBookings);
router.patch("/:id", updateBooking);
router.delete("/:id", deleteBooking);


export default router;
