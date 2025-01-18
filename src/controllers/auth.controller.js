import bcrypt from "bcryptjs";
import axios from "axios";

import User from "../models/user.model.js";
import OTP from "../models/otp.models.js";
import cloudinary from "../config/cloudinary.js";
import { oauth2client } from "../config/google.js";
import { sendMail } from "../services/email.service.js";
import {
  convertFullName,
  extractFaceEmbeddings,
  compareEmbeddings,
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

      const { password, ...userWithoutPassword } = user.toObject();

      res.status(201).json({ user: userWithoutPassword });
    } else {
      res.status(400).json({ message: "Dữ liệu người dùng không hợp lệ" });
    }
  } catch (err) {
    console.log(`Lỗi xử lý đăng ký: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const existingOTP = await OTP.findOne({ email });
    if (existingOTP) {
      return res
        .status(400)
        .json({ message: "OTP đã được gửi, vui lòng kiểm tra email của bạn." });
    }

    const otp = generateOTP();

    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(otp, salt);

    const newOTP = new OTP({
      email,
      otp: hashedOTP,
    });

    if (newOTP) {
      await newOTP.save();

      await sendMail(email, otp);

      res.status(200).json({ message: 'OTP đã được gửi thành công.' });
    } else {
      res.status(400).json({ message: "Dữ liệu OTP không hợp lệ" })
    }
  } catch (err) {
    console.log(`Lỗi gửi OTP: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return res.status(404).json({ message: 'Không tìm thấy OTP cho email này.' });
    }

    const isOTPCorrect = await bcrypt.compare(otp, otpRecord.otp);
    if (!isOTPCorrect) {
      return res.status(400).json({ message: 'OTP không đúng.' });
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

    const { password: _, ...userWithoutPassword } = user.toObject();

    res.status(200).json({ user: userWithoutPassword });
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
    const { code } = req.body;

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

    if (!user.accountType === "google") {
      return res
        .status(400)
        .json({ message: "Email đã được đăng ký, vui lòng nhập mật khẩu" });
    }

    generateToken(user._id, res);

    const { googleId: _, ...userWithoutGoogleId } = user.toObject();

    res.status(200).json({ user: userWithoutGoogleId });
  } catch (err) {
    console.log(`Lỗi ở đăng nhập bằng Google: ${err.message}`);
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
      `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,picture`
    );
    const { id: facebookId, name, picture } = userRes.data;

    let user = await User.findOne({ facebookId });

    if (!user) {
      const userName = await convertFullName(name);

      const newUser = new User({
        facebookId,
        accountType: "facebook",
        fullName: name,
        userName,
        avatar: picture.data.is_silhouette ? undefined : picture.data.url,
      });

      if (newUser) {
        user = await newUser.save();
      } else {
        return res
          .status(400)
          .json({ message: "Dữ liệu người dùng không hợp lệ" });
      }
    }

    generateToken(user._id, res);

    const { facebookId: _, ...userWithoutFacebookId } = user.toObject();

    res.status(200).json({ user: userWithoutFacebookId });
  } catch (err) {
    console.log(`Lỗi ở kiểm tra người dùng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const loginFaceId = async (req, res) => {
  try {
    const { faceId } = req.body;

    if (!faceId) {
      return res.status(400).json({ message: "Ảnh FaceID là bắt buộc." });
    }

    const uploadedEmbeddings = await extractFaceEmbeddings(faceId);

    const users = await User.find({
      "face.faceEmbeddings": { $exists: true },
    }).select("-password");

    let user = null;
    for (const check_user of users) {
      const storedEmbeddings = check_user.face.faceEmbeddings;

      const cosineSimilarity = compareEmbeddings(
        uploadedEmbeddings,
        storedEmbeddings
      );

      if (cosineSimilarity >= 0.8) {
        user = check_user;
        break;
      }
    }

    if (!user) {
      return res.status(400).json({ message: "Không tìm thấy người dùng" });
    }

    generateToken(user._id, res);

    res.status(200).json({ user });
  } catch (err) {
    console.log(`Lỗi cập nhật hồ sơ: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    const userId = req.user._id;

    if (!avatar) {
      return res.status(400).json({ message: "Yêu cầu avatar" });
    }

    const user = await User.findById(userId);

    if (user.avatar) {
      const publicId = user.avatar.split("/").slice(-2).join("/").split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    const uploadResponse = await cloudinary.uploader.upload(avatar, {
      public_id: `user_${userId}_avatar`,
      folder: "users/avatars",
    });

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

export const updateInfo = async (req, res) => {
  try {
    const { fullName, userName } = req.body;
    const userId = req.user._id;

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

    res.status(200).json(updatedUser);
  } catch (err) {
    console.log(`Lỗi cập nhật hồ sơ: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateFaceId = async (req, res) => {
  try {
    const { faceId } = req.body;
    const userId = req.user._id;

    if (!faceId) {
      return res.status(400).json({ message: "faceId là bắt buộc" });
    }

    const user = await User.findById(userId);

    if (user.face && user.face.faceUrl) {
      const publicId = user.face.faceUrl
        .split("/")
        .slice(-2)
        .join("/")
        .split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    const uploadResponse = await cloudinary.uploader.upload(faceId, {
      public_id: `user_${userId}_faceid`,
      folder: "users/faceids",
    });

    const embeddings = await extractFaceEmbeddings(uploadResponse.secure_url);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        face: {
          faceUrl: uploadResponse.secure_url,
          faceEmbeddings: embeddings,
        },
      },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (err) {
    console.log(`Lỗi cập nhật hồ sơ: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
