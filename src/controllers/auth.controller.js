import bcrypt from "bcryptjs";
import twilio from "twilio";
import dotenv from "dotenv";

import User from "../models/user.model.js";
import { generateToken, generateOTP } from "../lib/utils.js";
import cloudinary from "../lib/cloudinary.js";
import { convertFullName } from "../lib/utils.js";

dotenv.config();

export const signup = async (req, res) => {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const { phoneNumber } = req.body;

  const existingUser = await User.findOne({ phoneNumber });

  if (existingUser) {
    return res.status(400).json({ message: "Số điện thoại đã được đăng ký" });
  }

  await client.messages
    .create({
      body: `Mã xác minh của bạn là: ${generateOTP()}`,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      to: phoneNumber,
    })
    .then((message) =>
      res.status(200).json({ success: true, messageSid: message.sid })
    )
    .catch((err) => res.status(400).json({ success: false, err: err.message }));
};

export const verifyOTP = async (req, res) => {
  const { phoneNumber, otp } = req.body;
  res.status(200).json({ success: true, message: 'OTP verified!' });
}

// export const signup = async (req, res) => {
//   const { email, fullName, password } = req.body;
//   try {
//     if (!email || !fullName || !password) {
//       return res
//         .status(400)
//         .json({ message: "Tất cả các trường đều bắt buộc" });
//     }

//     if (password.length < 6) {
//       return res.status(400).json({ message: "Mật khẩu phải lớn hơn 6 ký tự" });
//     }

//     const user = await User.findOne({ email });
//     if (user) {
//       return res.status(400).json({ message: "Email đã tồn tại" });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     const userName = await convertFullName(fullName)

//     const newUser = new User({
//       email,
//       fullName,
//       userName,
//       password: hashedPassword,
//     });

//     if (newUser) {
//       generateToken(newUser._id, res);
//       await newUser.save();

//       res.status(201).json({
//         _id: newUser._id,
//         email: newUser.email,
//         fullName: newUser.fullName,
//         avatar: newUser.avatar,
//       });
//     } else {
//       res.status(400).json({ message: "Dữ liệu người dùng không hợp lệ" });
//     }
//   } catch (err) {
//     console.log(`Lỗi xử lý đăng ký: ${err.message}`);
//     res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
//   }
// };

export const login = async (req, res) => {
  const { phoneNumber, password } = req.body;
  try {
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(400).json({ message: "Người dùng không tồn tại" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Mật khẩu không khớp" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      userName: user.userName,
      avatar: user.avatar,
    });
  } catch (err) {
    console.log(`Lỗi xử lý đăng nhập: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Đăng xuất thành công" });
  } catch (err) {
    console.log(`Lỗi xử lý đăng xuất: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { avatar } = req.body;
    const userId = req.user._id;

    if (!avatar) {
      return res.status(400).json({ message: "Avatar là bắt buộc" });
    }

    const uploadResponse = await cloudinary.uploader.upload(avatar);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (err) {
    console.log(`Lỗi cập nhật hồ sơ: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const checkAuth = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (err) {
    console.log(`Lỗi ở kiểm tra người dùng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
