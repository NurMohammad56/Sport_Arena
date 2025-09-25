import AppError from "../errors/AppError";
import { Booking } from "../model/booking.model";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

export const checkAvailability = catchAsync(async (req, res) => {
  const { fieldId, date } = req.body;

  if (!fieldId || !date) {
    throw new AppError(400, "Field ID and date are required");
  }

  const bookings = await Booking.find({ fieldId, date });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Availability fetched successfully",
    data: bookings,
  });
});

export const createBooking = catchAsync(async (req, res) => {
  const { fieldId, date, startTime, endTime, duration } = req.body;
  const userId = req.user._id; // assuming auth middleware

  const field = await Field.findById(fieldId);
  if (!field) throw new AppError(404, "Field not found");

  const totalPrice = field.pricePerHour * duration;

  const booking = await Booking.create({
    fieldId,
    userId,
    ownerId: field.createdBy,
    date,
    startTime,
    endTime,
    duration,
    totalPrice,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Booking created successfully (pending payment)",
    data: booking,
  });
});


export const getBookingById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id)
    .populate("fieldId")
    .populate("userId", "name email");

  if (!booking) throw new AppError(404, "Booking not found");

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Booking fetched successfully",
    data: booking,
  });
});

// Get all bookings (Admin only)
export const getAllBookings = catchAsync(async (req, res) => {
  const bookings = await Booking.find()
    .populate("fieldId")
    .populate("userId", "name email");

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All bookings fetched successfully",
    data: bookings,
  });
});

// Get all my bookings (as a user)
export const getMyBookings = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const bookings = await Booking.find({ userId })
    .populate("fieldId")
    .sort({ createdAt: -1 });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "My bookings fetched successfully",
    data: bookings,
  });
});

// Get all bookings for my field (field owner)
export const getMyFieldBookings = catchAsync(async (req, res) => {
  const ownerId = req.user._id;

  const fields = await Field.find({ ownerId }).select("_id");
  const fieldIds = fields.map((f) => f._id);

  const bookings = await Booking.find({ fieldId: { $in: fieldIds } })
    .populate("userId", "name email")
    .populate("fieldId");

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Bookings for my fields fetched successfully",
    data: bookings,
  });
});

// Update booking (only if pending)
export const updateBooking = catchAsync(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id);
  if (!booking) throw new AppError(404, "Booking not found");

  if (booking.paymentStatus === "paid") {
    throw new AppError(400, "Cannot update a paid booking");
  }

  const updated = await Booking.findByIdAndUpdate(id, req.body, { new: true });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Booking updated successfully",
    data: updated,
  });
});

// Delete booking (only if pending)
export const deleteBooking = catchAsync(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id);
  if (!booking) throw new AppError(404, "Booking not found");

  if (booking.paymentStatus === "paid") {
    throw new AppError(400, "Cannot delete a paid booking");
  }

  await Booking.findByIdAndDelete(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Booking deleted successfully",
    data: null,
  });
});