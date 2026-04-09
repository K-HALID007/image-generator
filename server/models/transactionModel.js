import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },

  plan: { type: String, required: true },

  // store amount in paise (recommended)
  amount: { type: Number, required: true },

  credits: { type: Number, required: true },

  // Razorpay fields (NEW)
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },

  // payment status
  payment: { type: Boolean, default: false },

  date: { type: Number, default: Date.now },
});

const transactionModel =
  mongoose.models.transaction ||
  mongoose.model("transaction", transactionSchema);

export default transactionModel;
