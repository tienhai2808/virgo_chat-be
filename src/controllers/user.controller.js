import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import Relationship from "../models/relationship.model.js";

export const getUsers = async (req, res) => {
  const currentUserId = req.user._id;
  const { q, page = 1, limit = 10 } = req.query;
  try {
    const currentPage = Math.max(1, parseInt(page));
    const perPage = Math.min(parseInt(limit), 50);
    const skip = (currentPage - 1) * perPage;

    const blockedUsers = await Relationship.find({
      to: currentUserId,
      relationshipType: "block",
    }).select("from");

    const blockedIds = blockedUsers.map((u) => u.from);

    const filter = {
      _id: { $nin: [currentUserId, ...blockedIds] },
      isSuperUser: { $ne: true },
    };

    if (q && q.trim() !== "") {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [{ userName: regex }, { email: regex }, { fullName: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("_id fullName userName avatar")
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
    console.log(`Lỗi lấy thông tin người dùng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const getUser = async (req, res) => {
  const { userId } = req.params;
  try {
    if (!userId) {
      return res.status(400).json({ message: "Yêu cầu userId" });
    }

    const user = await User.findOne({ _id: userId });

    const notification = await Notification.findOne({
      sender: req.user._id,
      "receivers.user": userId,
      notificationType: "private",
    })
      .populate({
        path: "receivers.user",
        select: "_id fullName userName avatar",
      })
      .sort({ createdAt: -1 })
      .lean();

    const relationship = await Relationship.findOne({
      $or: [
        { from: req.user._id, to: userId },
        { from: userId, to: req.user._id },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      userName: user.userName,
      avatar: user.avatar,
      createdAt: user.createdAt,
      latestNotification: notification ? notification : undefined,
      relationshipType: relationship
        ? relationship.relationshipType
        : undefined,
    });
  } catch (err) {
    console.log(`Lỗi lấy thông tin người dùng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
