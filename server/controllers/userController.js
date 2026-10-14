import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { json } from "express";
import jwt from "jsonwebtoken";
import razorpay from "razorpay";
import transactionModel from "../models/transactionModel.js";
import transporter from "../config/nodemailer.js";
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.json({ success: false, message: "Missing Details" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email,
      password: hashedPassword,
    };
    const newUser = new userModel(userData);
    const user = await newUser.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({
      success: true,
      token,
      user: { name: user.name },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }

    const isMatched = await bcrypt.compare(password, user.password);
    if (isMatched) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.json({
        success: true,
        token,
        user: { name: user.name },
      });
    } else {
      return res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const userCredits = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await userModel.findById(userId);
    res.json({
      success: true,
      credits: user.creditBalance,
      user: { name: user.name },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const paymentRazorpay = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.userId; // Extract from token middleware

    if (!userId || !planId) {
      return res.json({ success: false, message: "Missing Details" });
    }

    let credits, plan, amount;
    switch (planId) {
      case "Basic":
        plan = "Basic";
        credits = 100;
        amount = 10;
        break;
      case "Advanced":
        plan = "Advanced";
        credits = 500;
        amount = 50;
        break;
      case "Business":
        plan = "Business";
        credits = 5000;
        amount = 250;
        break;
      default:
        return res.json({ success: false, message: "Plan not found" });
    }

    const transactionData = {
      userId,
      plan,
      amount,
      credits,
      date: Date.now(),
    };

    const newTransaction = await transactionModel.create(transactionData);

    const options = {
      amount: amount * 100,
      currency: process.env.CURRENCY || "INR",
      receipt: newTransaction._id.toString(),
    };

    const order = await razorpayInstance.orders.create(options);

    await transactionModel.findByIdAndUpdate(newTransaction._id, {
      razorpayOrderId: order.id,
    });

    
    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// const verifyRazorpay = async (req, res) => {
//   try {
//     const { razorpay_order_id } = req.body;
//     const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
//     if (orderInfo.status === "paid") {
//       const transactionData = await transactionModel.findById(
//         orderInfo.receipt,
//       );

//       if (transactionData.payment) {
//         return res.json({ success: false, message: "Payment Failed" });
//       }
//       const userData = await userModel.findById(transactionData.userId);
//       const creditBalance = userData.creditBalance + transactionData.credits;
//       await userModel.findByIdAndUpdate(userData._id, { creditBalance });

//       await transactionModel.findByIdAndUpdate(transactionData._id, {
//         payment: true,
//       });
//       res.json({ success: true, message: "Credits Added" });
//     } else {
//       res.json({ success: false, message: "Payment Failed" });
//     }
//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: error.message });
//   }
// };

const verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.json({ success: false, message: "Invalid signature" });
    }

    const transaction = await transactionModel.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!transaction || transaction.payment) {
      return res.json({ success: false, message: "Invalid transaction" });
    }

    await userModel.findByIdAndUpdate(transaction.userId, {
      $inc: { creditBalance: transaction.credits },
    });

    await transactionModel.findByIdAndUpdate(transaction._id, {
      payment: true,
      razorpayPaymentId: razorpay_payment_id,
    });

    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

const sendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.json({ success: false, message: "Email is required" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found with this email" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;
    await user.save();

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: "Password Reset OTP - Imagify",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb; text-align: center;">Imagify Password Reset</h2>
          <p>Hello <b>${user.name}</b>,</p>
          <p>You requested a password reset for your Imagify account. Use the OTP below to reset your password:</p>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1e293b; margin: 20px 0; border-radius: 6px;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 14px;">This OTP is valid for 15 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: "Reset OTP sent to your email",
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.json({ success: false, message: "Email and OTP are required" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (Date.now() > user.resetOtpExpireAt) {
      return res.json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    return res.json({ success: true, message: "OTP verified successfully!" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.json({ success: false, message: "Missing required details" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (Date.now() > user.resetOtpExpireAt) {
      return res.json({ success: false, message: "OTP has expired" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetOtp = "";
    user.resetOtpExpireAt = 0;
    await user.save();

    return res.json({
      success: true,
      message: "Password reset successful! Please login",
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export {
  registerUser,
  loginUser,
  userCredits,
  paymentRazorpay,
  verifyRazorpay,
  sendResetOtp,
  verifyResetOtp,
  resetPassword,
};


