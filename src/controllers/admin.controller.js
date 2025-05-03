import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { userSocketMap } from "../services/socket.service.js";
import { countImagesInFolder } from "../utils/admin.util.js";

export const countDimensions = async (req, res) => {
  try {
    const userCount = await User.countDocuments({ isSuperUser: false });
    const superUserCount = await User.countDocuments({ isSuperUser: true });
    const onlineUserCount = userSocketMap.size;
    const imageMessageCount = await Message.countDocuments({
      image: { $exists: true },
    });
    const imageMessageInCloud = await countImagesInFolder("messages");

    res.status(200).json({
      userCount,
      superUserCount,
      onlineUserCount,
      imageMessageCount,
      imageMessageInCloud,
    });
  } catch (err) {
    console.log(`Lỗi đêm các chiều: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const getAllUsers = async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;
  try {
    const currentPage = Math.max(1, parseInt(page));
    const perPage = Math.min(parseInt(10), 50);
    const skip = (currentPage - 1) * perPage;

    let filter = {};
    if (q && q.trim() !== "") {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [{ userName: regex }, { email: regex }, { fullName: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -faceId -__v")
        .skip(skip)
        .limit(perPage)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      data: users,
      meta: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (err) {
    console.log(`Lỗi lấy tất cả người dùng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const getAllCharts = async (req, res) => {
  try {
    // Account chart
    const countVirgoAccount = await User.countDocuments({
      accountType: "virgo",
    });
    const countGoogleAccount = await User.countDocuments({
      accountType: "google",
    });

    // Message by day of week chart
    const messages = await Message.aggregate([
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const result = Array(7).fill(0);
    messages.forEach(({ _id, count }) => {
      result[(_id + 5) % 7] = count;
    });

    res.status(200).json({
      accountChart: {
        labels: ["Virgo", "Google"],
        data: [countVirgoAccount, countGoogleAccount],
      },
      messageByDayOfWeekChart: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        data: result,
      },
    });
  } catch (err) {
    console.log(`Lỗi lấy tất cả biểu đồ: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
