const mongoose = require("mongoose");

const roles = ["SuperAdmin", "Admin", "Supplier", "Customer"];

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    role: { type: String, enum: roles, default: "Customer" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
