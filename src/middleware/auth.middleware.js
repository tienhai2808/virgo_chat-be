import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res
        .status(401)
        .json({
          message: "Người dùng chưa đăng nhập - Chưa được cung cấp Token",
        });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res
        .status(401)
        .json({ message: "Người dùng chưa đăng nhập - Token không hợp lệ" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    req.user = user;

    next();
  } catch (err) {
    console.log(`Lỗi ở protectRoute middleware: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ cục bộ" });
  }
};
