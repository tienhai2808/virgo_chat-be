import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import Relationship from "../models/relationship.model.js";

export const getUsers = async (req, res) => {
  const currentUserId = req.user._id;
  try {
    const users = await User.find({ _id: { $ne: currentUserId } }).select(
      "_id fullName userName avatar"
    );
    res.status(200).json(users);
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
      .sort({ createdAt: -1 })
      .lean();

    const relationship = await Relationship.findOne({
      $or: [
        { user1: req.user._id, user2: userId },
        { user1: userId, user2: req.user._id },
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
      latestNotificationStatus: notification
        ? notification.receivers[0].status
        : undefined,
      relationshipStatus: relationship ? relationship.status : undefined,
    });
  } catch (err) {
    console.log(`Lỗi lấy thông tin người dùng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
