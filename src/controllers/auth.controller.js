import bcrypt from "bcryptjs";
import axios from "axios";
import * as faceapi from "face-api.js";

import User from "../models/user.model.js";
import OTP from "../models/otp.models.js";
import cloudinary from "../config/cloudinary.js";
import { oauth2client } from "../config/google.js";
import {
  sendMailSignUp,
  sendMailResetPassword,
} from "../services/email.service.js";
import {
  convertFullName,
  generateOTP,
  generateToken,
} from "../utils/auth.util.js";

export const signup = async (req, res) => {
  const { email, fullName, password } = req.body;
  try {
    if (!email || !fullName || !password) {
      return res
        .status(400)
        .json({ message: "Tất cả các trường đều bắt buộc" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải lớn hơn 6 ký tự" });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userName = await convertFullName(fullName);

    const newUser = new User({
      email,
      fullName,
      userName,
      password: hashedPassword,
    });

    if (newUser) {
      user = await newUser.save();

      generateToken(user._id, res);

      res.status(201).json({
        _id: user._id,
        email: user.email,
        accountType: user.accountType,
        fullName: user.fullName,
        userName: user.userName,
        avatar: user.avatar,
        createdAt: user.createdAt,
      });
    } else {
      res.status(400).json({ message: "Dữ liệu người dùng không hợp lệ" });
    }
  } catch (err) {
    console.log(`Lỗi xử lý đăng ký: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const sendOTPSignUp = async (req, res) => {
  const { email } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Người dùng đã tồn tại " });
    }

    const existingOTP = await OTP.findOne({ email, otpType: "signup" });
    if (existingOTP) {
      return res
        .status(400)
        .json({ message: "OTP đã được gửi, vui lòng kiểm tra email" });
    }

    const otp = generateOTP();

    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(otp, salt);

    const newOTP = new OTP({
      email,
      otp: hashedOTP,
      otpType: "signup",
    });

    if (newOTP) {
      await newOTP.save();

      await sendMailSignUp(email, otp);

      res.status(200).json({ message: "OTP đã được gửi thành công." });
    } else {
      res.status(400).json({ message: "Dữ liệu OTP không hợp lệ" });
    }
  } catch (err) {
    console.log(`Lỗi gửi OTP SignUp: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const verifyOTPSignUp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const otpRecord = await OTP.findOne({ email, otpType: "signup" });

    if (!otpRecord) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy OTP cho email này." });
    }

    const isOTPCorrect = await bcrypt.compare(otp, otpRecord.otp);
    if (!isOTPCorrect) {
      return res.status(400).json({ message: "OTP không đúng." });
    }

    await otpRecord.deleteOne();

    res.status(200).send({ message: "Xác thực OTP thành công" });
  } catch (err) {
    console.log(`Lỗi xác nhận OTP: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Người dùng không tồn tại" });
    }

    if (user.accountType === "google") {
      return res
        .status(400)
        .json({ message: "Email phải đăng nhập bằng Google" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Mật khẩu không khớp" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      email: user.email,
      accountType: user.accountType,
      fullName: user.fullName,
      userName: user.userName,
      avatar: user.avatar,
      createdAt: user.createdAt,
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

export const loginGoogle = async (req, res) => {
  const { code } = req.body;
  try {
    if (!code) {
      return res.status(400).json({ message: "Yêu cầu code" });
    }

    const googleRes = await oauth2client.getToken(code);
    oauth2client.setCredentials(googleRes.tokens);

    const userRes = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
    );

    const { email, id: googleId, name, picture } = userRes.data;

    let user = await User.findOne({ email });

    if (!user) {
      const userName = await convertFullName(name);

      const newUser = new User({
        email,
        googleId,
        accountType: "google",
        fullName: name,
        userName,
        avatar: picture,
      });

      if (newUser) {
        user = await newUser.save();
      } else {
        return res
          .status(400)
          .json({ message: "Dữ liệu người dùng không hợp lệ" });
      }
    }

    if (user.accountType !== "google") {
      return res
        .status(400)
        .json({ message: "Email đã được đăng ký, vui lòng nhập mật khẩu" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      email: user.email,
      accountType: user.accountType,
      fullName: user.fullName,
      userName: user.userName,
      avatar: user.avatar,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.log(`Lỗi ở đăng nhập bằng Google: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const loginFaceId = async (req, res) => {
  const { faceId } = req.body;
  try {
    if (!faceId) {
      return res
        .status(400)
        .json({ message: "Thiếu dữ liệu đặc trưng khuôn mặt" });
    }

    const faces = await User.find();

    let user = null;
    let minDistance = Infinity;

    for (const face of faces) {
      if (face.faceId.length > 0) {
        const distance = faceapi.euclideanDistance(face.faceId, faceId);
        if (distance < 0.4 && distance < minDistance) {
          minDistance = distance;
          user = face;
        }
      }
    }

    if (!user) {
      return res.status(401).json({ message: "Xác thực không thành công" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      email: user.email,
      accountType: user.accountType,
      fullName: user.fullName,
      userName: user.userName,
      avatar: user.avatar,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.log(`Lỗi đăng nhập bằng faceId: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    if (!email || !newPassword) {
      return res.status(400).json({ message: "Tất cả các trường là bắt buộc" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await User.findOneAndUpdate(
      { email: email },
      { password: hashedNewPassword },
      { new: true }
    );
    
    res.status(200).json({ message: "Đã lấy lại mật khẩu" });
  } catch (err) {
    console.log(`Lỗi ở kiểm tra người dùng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const sendOTPResetPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Người dùng không tồn tại" });
    }

    if (user.accountType !== "virgo") {
      return res
        .status(400)
        .json({ message: "Tài khoản đăng nhập bằng bên thứ 3" });
    }

    const existingOTP = await OTP.findOne({ email, otpType: "reset-password" });
    if (existingOTP) {
      return res
        .status(400)
        .json({ message: "OTP đã được gửi, vui lòng kiểm tra email" });
    }

    const otp = generateOTP();

    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(otp, salt);

    const newOTP = new OTP({
      email,
      otp: hashedOTP,
      otpType: "reset-password",
    });

    if (newOTP) {
      await newOTP.save();

      await sendMailResetPassword(email, otp);

      res.status(200).json({ message: "OTP đã được gửi thành công." });
    } else {
      res.status(400).json({ message: "Dữ liệu OTP không hợp lệ" });
    }
  } catch (err) {
    console.log(`Lỗi gửi OTP SignUp: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const verifyOTPResetPassword = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const otpRecord = await OTP.findOne({ email, otpType: "reset-password" });

    if (!otpRecord) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy OTP cho email này." });
    }

    const isOTPCorrect = await bcrypt.compare(otp, otpRecord.otp);
    if (!isOTPCorrect) {
      return res.status(400).json({ message: "OTP không đúng." });
    }

    await otpRecord.deleteOne();

    res.status(200).send({ message: "Xác thực OTP thành công" });
  } catch (err) {
    console.log(`Lỗi gửi OTP SignUp: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateAvatar = async (req, res) => {
  const { avatar } = req.body;
  const userId = req.user._id;
  try {
    if (!avatar) {
      return res.status(400).json({ message: "Yêu cầu avatar" });
    }

    const uploadResponse = await cloudinary.uploader.upload(avatar, {
      folder: "users",
      resource_type: "image",
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json({
      _id: updatedUser._id,
      email: updatedUser.email,
      accountType: updatedUser.accountType,
      fullName: updatedUser.fullName,
      userName: updatedUser.userName,
      avatar: updatedUser.avatar,
      createdAt: updatedUser.createdAt,
    });
  } catch (err) {
    console.log(`Lỗi cập nhật hồ sơ: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateInfo = async (req, res) => {
  const { fullName, userName } = req.body;
  const userId = req.user._id;
  try {
    if (userName) {
      const checkUserName = await User.findOne({ userName });
      if (checkUserName) {
        return res.status(400).json({ message: "Tên người dùng đã tồn tại" });
      }
    }

    const updateFields = {};
    if (fullName) updateFields.fullName = fullName;
    if (userName) updateFields.userName = userName;

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
      new: true,
    });

    res.status(200).json({
      _id: updatedUser._id,
      email: updatedUser.email,
      accountType: updatedUser.accountType,
      fullName: updatedUser.fullName,
      userName: updatedUser.userName,
      avatar: updatedUser.avatar,
      createdAt: updatedUser.createdAt,
    });
  } catch (err) {
    console.log(`Lỗi cập nhật hồ sơ: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateFaceId = async (req, res) => {
  const { faceId } = req.body;
  try {
    if (!faceId) {
      return res
        .status(400)
        .json({ message: "Dữ liệu đặc trưng khuôn mặt là bắt buộc" });
    }

    const userId = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { faceId: faceId },
      { new: true }
    );

    res.status(200).json({
      _id: updatedUser._id,
      email: updatedUser.email,
      accountType: updatedUser.accountType,
      fullName: updatedUser.fullName,
      userName: updatedUser.userName,
      avatar: updatedUser.avatar,
      createdAt: updatedUser.createdAt,
    });
  } catch (err) {
    console.log(`Lỗi cập nhật hồ sơ: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = req.user;
  try {
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Các trường đều bắt buộc" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    if (user.accountType !== "virgo") {
      return res
        .status(400)
        .json({ message: "Người dùng sử dụng tài khoản bên thứ 3" });
    }

    const isOldPasswordCorrect = await bcrypt.compare(
      oldPassword,
      user.password
    );
    if (!isOldPasswordCorrect) {
      return res.status(400).json({ message: "Mật khẩu cũ không khớp" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { password: hashedNewPassword },
      { new: true }
    );

    res.status(200).json({
      _id: updatedUser._id,
      email: updatedUser.email,
      accountType: updatedUser.accountType,
      fullName: updatedUser.fullName,
      userName: updatedUser.userName,
      avatar: updatedUser.avatar,
      createdAt: updatedUser.createdAt,
    });
  } catch (err) {
    console.log(`Lỗi cập nhật hồ sơ: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
