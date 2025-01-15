import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";


export const googleCallBack =  async (req, res) => {
  const googleId = req.user.id 
  try {
    const user = await User.findOne({ googleId })

    if (!user) {
      return res.status(400).json({ message: "Người dùng không tồn tại" });
    }

    generateToken(googleId, res)

    res.status(200).json({
      _id: user._id,
      email: user.email,
      fullName: user.fullName, 
      userName: user.userName,
      avatar: user.avatar,
    })
  } catch (err) {
    console.log(`Lỗi xử lý đăng nhập: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
}

export const googleLogout = (req, res) => {
  try {
    req.logout();
    res.status(200).json({ message: "Đăng xuất thành công" });
  } catch (err) {
    console.log(`Lỗi ở kiểm tra người dùng: ${err.message}`)
    res.status(500).json({ message: "Lỗi máy chủ nội bộ"})
  }
}