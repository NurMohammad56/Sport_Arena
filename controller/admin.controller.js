import mongoose from "mongoose";
import httpStatus from "http-status";
import { User } from "../model/user.model.js";
import { paymentInfo } from "../model/payment.model.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";

export const getAdminDashboardOverview = catchAsync(async (req, res) => {
  const { filter = "monthly" } = req.query; // "weekly" | "monthly" | "yearly"

  const totalRevenueAgg = await paymentInfo.aggregate([
    { $match: { paymentStatus: "complete" } },
    { $group: { _id: null, total: { $sum: "$price" } } },
  ]);
  const totalRevenue = totalRevenueAgg[0]?.total || 0;

  const totalUsers = await User.countDocuments({ role: "User" });
  const totalFieldOwners = await User.countDocuments({ role: "FieldOwner" });

  // ============ User Joining Overview ============
  let groupFormat;
  if (filter === "yearly") groupFormat = { $year: "$createdAt" };
  else if (filter === "monthly") groupFormat = { $month: "$createdAt" };
  else groupFormat = { $week: "$createdAt" }; // default weekly

  const joiningOverview = await User.aggregate([
    { $match: { role: "User" } },
    {
      $group: {
        _id: groupFormat,
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin dashboard overview retrieved",
    data: {
      totalRevenue,
      totalUsers,
      totalFieldOwners,
      joiningOverview,
    },
  });
});

export const getFieldOwnersWithPlan = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const owners = await User.aggregate([
    { $match: { role: "FieldOwner" } },
    {
      $lookup: {
        from: "paymentinfos",
        localField: "_id",
        foreignField: "userId",
        as: "payments",
      },
    },
    {
      $lookup: {
        from: "plans",
        localField: "payments.planId",
        foreignField: "_id",
        as: "plans",
      },
    },
    {
      $addFields: {
        spentOnSubscription: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$payments",
                  as: "p",
                  cond: { $eq: ["$$p.paymentStatus", "complete"] },
                },
              },
              as: "completed",
              in: "$$completed.price",
            },
          },
        },
        latestPlan: { $arrayElemAt: ["$plans.name", -1] },
        latestStatus: { $arrayElemAt: ["$payments.paymentStatus", -1] },
      },
    },
    {
      $project: {
        name: 1,
        email: 1,
        createdAt: 1,
        spentOnSubscription: 1,
        planName: "$latestPlan",
        status: "$latestStatus",
      },
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: parseInt(limit) },
  ]);

  const total = await User.countDocuments({ role: "FieldOwner" });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Field owners with subscription details retrieved",
    meta: { total, page: parseInt(page), limit: parseInt(limit) },
    data: owners,
  });
});
