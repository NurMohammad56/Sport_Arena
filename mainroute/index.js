import express from "express";

import authRoute from "../route/auth.route.js";
import userRoute from "../route/user.route.js";
import admin from "../route/admin.route.js";
import fieldRoute from "../route/field.route.js";
import planRoute from "../route/plan.route.js";
import paymentRoute from "../route/payment.route.js";
import wallRoute from "../route/wall.route.js";
import bookingRoute from "../route/booking.route.js";

const router = express.Router();

// Mounting the routes
router.use("/auth", authRoute);
router.use("/user", userRoute);
router.use("/admin", admin);
router.use("/field", fieldRoute);
router.use("/plan", planRoute);
router.use("/payment", paymentRoute);
router.use("/wall", wallRoute);
router.use("/booking", bookingRoute);

export default router;
