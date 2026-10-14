import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "react-toastify";
import { User, Mail, Lock, KeyRound, Eye, EyeOff, X } from "lucide-react";

const Login = () => {
  const [state, setState] = useState("Login"); // "Login" | "Sign Up" | "Forgot Password"
  const { setShowLogin, backendUrl, setToken, setUser } =
    useContext(AppContext);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: Verify OTP, 3: New & Confirm Password
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetAllFields = () => {
    setName("");
    setEmail("");
    setPassword("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotStep(1);
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (state === "Login") {
        const { data } = await axios.post(backendUrl + "/api/user/login", {
          email,
          password,
        });
        if (data.success) {
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem("token", data.token);
          setShowLogin(false);
          toast.success("Logged in successfully!");
          resetAllFields();
        } else {
          toast.error(data.message);
        }
      } else if (state === "Sign Up") {
        const { data } = await axios.post(backendUrl + "/api/user/register", {
          name,
          email,
          password,
        });
        if (data.success) {
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem("token", data.token);
          setShowLogin(false);
          toast.success("Account created successfully!");
          resetAllFields();
        } else {
          toast.error(data.message);
        }
      } else if (state === "Forgot Password") {
        if (forgotStep === 1) {
          // Step 1: Send OTP to Email
          const { data } = await axios.post(
            backendUrl + "/api/user/send-reset-otp",
            { email }
          );
          if (data.success) {
            setForgotStep(2);
            toast.success(data.message || "OTP sent successfully!");
          } else {
            toast.error(data.message);
          }
        } else if (forgotStep === 2) {
          // Step 2: Verify OTP only
          if (!otp || otp.length < 6) {
            toast.error("Please enter a valid 6-digit OTP");
            setLoading(false);
            return;
          }
          const { data } = await axios.post(
            backendUrl + "/api/user/verify-reset-otp",
            { email, otp }
          );
          if (data.success) {
            setForgotStep(3);
            toast.success("OTP verified! Now enter your new password");
          } else {
            toast.error(data.message);
          }
        } else if (forgotStep === 3) {
          // Step 3: Enter and Confirm New Password
          if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters long");
            setLoading(false);
            return;
          }
          if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match!");
            setLoading(false);
            return;
          }
          const { data } = await axios.post(
            backendUrl + "/api/user/reset-password",
            { email, otp, newPassword }
          );
          if (data.success) {
            toast.success(data.message || "Password reset successfully! Please login");
            setState("Login");
            resetAllFields();
          } else {
            toast.error(data.message);
          }
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-50 backdrop-blur-sm bg-black/40 flex justify-center items-center p-4">
      <motion.form
        onSubmit={onSubmitHandler}
        initial={{ opacity: 0.2, y: 50 }}
        transition={{ duration: 0.4 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative bg-white p-8 sm:p-10 rounded-2xl shadow-2xl text-slate-500 w-full max-w-md"
      >
        <h1 className="text-center text-2xl text-neutral-800 font-semibold">
          {state === "Forgot Password"
            ? forgotStep === 1
              ? "Forgot Password"
              : forgotStep === 2
              ? "Verify OTP"
              : "Reset Password"
            : state}
        </h1>
        <p className="text-sm text-center mt-1 text-slate-500">
          {state === "Login"
            ? "Welcome back! Please sign in to continue"
            : state === "Sign Up"
            ? "Create an account to get 5 free credits"
            : forgotStep === 1
            ? "Enter your registered email to receive an OTP"
            : forgotStep === 2
            ? `Enter the 6-digit OTP sent to ${email}`
            : "Enter your new password and confirm it"}
        </p>

        {/* Full Name input for Sign Up */}
        {state === "Sign Up" && (
          <div className="border border-gray-300 px-4 py-2.5 flex items-center gap-2.5 rounded-full mt-5 focus-within:border-blue-500 transition-all">
            <User size={18} className="text-gray-400 shrink-0" />
            <input
              onChange={(e) => setName(e.target.value)}
              value={name}
              className="outline-none text-sm w-full bg-transparent"
              type="text"
              placeholder="Full Name"
              required
            />
          </div>
        )}

        {/* Email input (used in Login, Sign Up, and Forgot Password Step 1) */}
        {(state !== "Forgot Password" || forgotStep === 1) && (
          <div className="border border-gray-300 px-4 py-2.5 flex items-center gap-2.5 rounded-full mt-4 focus-within:border-blue-500 transition-all">
            <Mail size={18} className="text-gray-400 shrink-0" />
            <input
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              className="outline-none text-sm w-full bg-transparent"
              type="email"
              placeholder="Email address"
              required
            />
          </div>
        )}

        {/* Password input for Login and Sign Up */}
        {state !== "Forgot Password" && (
          <div className="border border-gray-300 px-4 py-2.5 flex items-center gap-2.5 rounded-full mt-4 focus-within:border-blue-500 transition-all">
            <Lock size={18} className="text-gray-400 shrink-0" />
            <input
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              className="outline-none text-sm w-full bg-transparent"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="focus:outline-none text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        )}

        {/* STEP 2: OTP Input */}
        {state === "Forgot Password" && forgotStep === 2 && (
          <div className="border border-gray-300 px-4 py-2.5 flex items-center gap-2.5 rounded-full mt-5 focus-within:border-blue-500 transition-all">
            <KeyRound size={18} className="text-gray-400 shrink-0" />
            <input
              onChange={(e) => setOtp(e.target.value)}
              value={otp}
              className="outline-none text-sm w-full bg-transparent tracking-widest font-semibold"
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              required
              autoFocus
            />
          </div>
        )}

        {/* STEP 3: New Password and Confirm Password */}
        {state === "Forgot Password" && forgotStep === 3 && (
          <>
            <div className="border border-gray-300 px-4 py-2.5 flex items-center gap-2.5 rounded-full mt-5 focus-within:border-blue-500 transition-all">
              <Lock size={18} className="text-gray-400 shrink-0" />
              <input
                onChange={(e) => setNewPassword(e.target.value)}
                value={newPassword}
                className="outline-none text-sm w-full bg-transparent"
                type={showNewPassword ? "text" : "password"}
                placeholder="New Password (min 6 chars)"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="focus:outline-none text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="border border-gray-300 px-4 py-2.5 flex items-center gap-2.5 rounded-full mt-4 focus-within:border-blue-500 transition-all">
              <Lock size={18} className="text-gray-400 shrink-0" />
              <input
                onChange={(e) => setConfirmPassword(e.target.value)}
                value={confirmPassword}
                className="outline-none text-sm w-full bg-transparent"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="focus:outline-none text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </>
        )}

        {/* Forgot password link in Login view */}
        {state === "Login" && (
          <p
            onClick={() => {
              setState("Forgot Password");
              setForgotStep(1);
            }}
            className="text-sm text-blue-600 my-4 cursor-pointer hover:underline text-right"
          >
            Forgot password?
          </p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 transition-all w-full text-white py-2.5 rounded-full mt-4 font-medium disabled:opacity-60 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99]"
        >
          {loading
            ? "Please wait..."
            : state === "Login"
            ? "Login"
            : state === "Sign Up"
            ? "Create Account"
            : forgotStep === 1
            ? "Send Reset OTP"
            : forgotStep === 2
            ? "Verify OTP"
            : "Reset Password"}
        </button>

        {/* Step 2 Helper: Go back / Change Email */}
        {state === "Forgot Password" && forgotStep === 2 && (
          <p
            onClick={() => setForgotStep(1)}
            className="text-xs text-center text-blue-600 mt-3 cursor-pointer hover:underline"
          >
            Wrong email or didn't get OTP? Change email / Resend
          </p>
        )}

        {/* Footer Navigation */}
        {state === "Login" && (
          <p className="mt-5 text-center text-sm">
            Don't have an account?{" "}
            <span
              onClick={() => {
                setState("Sign Up");
                resetAllFields();
              }}
              className="text-blue-600 cursor-pointer font-medium hover:underline"
            >
              Sign Up
            </span>
          </p>
        )}

        {state === "Sign Up" && (
          <p className="mt-5 text-center text-sm">
            Already have an account?{" "}
            <span
              onClick={() => {
                setState("Login");
                resetAllFields();
              }}
              className="text-blue-600 cursor-pointer font-medium hover:underline"
            >
              Login
            </span>
          </p>
        )}

        {state === "Forgot Password" && (
          <p className="mt-5 text-center text-sm">
            Remember your password?{" "}
            <span
              onClick={() => {
                setState("Login");
                resetAllFields();
              }}
              className="text-blue-600 cursor-pointer font-medium hover:underline"
            >
              Back to Login
            </span>
          </p>
        )}

        {/* Close Modal Button */}
        <button
          type="button"
          onClick={() => {
            setShowLogin(false);
            resetAllFields();
          }}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </motion.form>
    </div>
  );
};

export default Login;
