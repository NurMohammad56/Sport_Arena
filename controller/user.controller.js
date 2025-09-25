import httpStatus from "http-status";
import { User } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/commonMethod.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";

// Get user profile
export const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken -verificationInfo -password_reset_token"
  );
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched successfully",
    data: user,
  });
});

// Update profile
export const updateProfile = catchAsync(async (req, res) => {
  const { name, position, age, FavoriteClub, location } = req.body;

  // Find user
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken -verificationInfo -password_reset_token"
  );
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // Update only provided fields
  if (name) user.name = name;
  if (age) user.age = age;
  if (position) user.position = position;
  if (FavoriteClub) user.FavoriteClub = FavoriteClub;
  if (location) user.location = location;

  if (req.file) {
    const result = await uploadOnCloudinary(req.file.buffer);
    user.avatar.public_id = result.public_id;
    user.avatar.url = result.secure_url;
  }

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

// Get advanced profile completion percentage
export const getProfileCompletion = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken -verificationInfo -password_reset_token"
  );

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // Define fields with weights
  const weightedFields = {
    name: 5,
    email: 15,
    "avatar.url": 15,
    age: 10,
    role: 5,
    position: 20,
    FavoriteClub: 20,
    location: 10,
  };

  let totalPoints = 0;
  let earnedPoints = 0;

  for (const field in weightedFields) {
    totalPoints += weightedFields[field];

    if (field.includes(".")) {
      const parts = field.split(".");
      if (user[parts[0]] && user[parts[0]][parts[1]]) {
        earnedPoints += weightedFields[field];
      }
    } else if (user[field]) {
      earnedPoints += weightedFields[field];
    }
  }

  const completionPercentage = Math.round((earnedPoints / totalPoints) * 100);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile completion fetched successfully",
    data: { completionPercentage },
  });
});

// Change user password
export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (newPassword !== confirmPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "New password and confirm password do not match"
    );
  }

  if (!(await User.isPasswordMatched(currentPassword, user.password))) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Current password is incorrect"
    );
  }

  user.password = newPassword;
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed successfully",
    data: user,
  });
});
