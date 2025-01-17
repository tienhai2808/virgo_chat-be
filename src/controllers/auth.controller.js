import bcrypt from "bcryptjs";
import axios from "axios";

import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import { convertFullName, oauth2client, generateToken } from "../lib/utils.js";

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

    const user = await User.findOne({ email });
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
      const token = generateToken(newUser._id, res);

      const savedUser = await newUser.save();
      const { password, ...userWithoutPassword } = savedUser.toObject();

      res.status(201).json({
        token,
        user: userWithoutPassword,
      });
    } else {
      res.status(400).json({ message: "Dữ liệu người dùng không hợp lệ" });
    }
  } catch (err) {
    console.log(`Lỗi xử lý đăng ký: ${err.message}`);
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

    if (!user.password) {
      return res
        .status(400)
        .json({ message: "Email phải đăng nhập bằng Google" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Mật khẩu không khớp" });
    }

    const token = generateToken(user._id, res);
    user = user.toObject();
    delete user.password;

    res.status(200).json({
      token,
      user,
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
  try {
    const { code } = req.query;

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

      user = await User.create({
        email,
        googleId,
        fullName: name,
        userName,
        avatar: picture,
      });
    }

    if (!user.googleId) {
      return res
        .status(400)
        .json({ message: "Email đã được đăng ký, vui lòng nhập mật khẩu" });
    }

    const token = generateToken(user._id, res);

    res.status(200).json({
      token,
      user,
    });
  } catch (err) {
    console.log(`Lỗi ở kiểm tra người dùng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const loginFacebook = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: "Yêu cầu access token" });
    }

    const userRes = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );
    const { email, id: facebookId, name, picture } = userRes.data;
    
  } catch (err) {}
};

export const getProfile = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (err) {
    console.log(`Lỗi ở kiểm tra người dùng: ${err.message}`);
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
