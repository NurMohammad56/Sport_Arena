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
