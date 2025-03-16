import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/user.model.js";
import argon2 from "argon2";
import inquirer from "inquirer";
dotenv.config();

mongoose.connect(process.env.MONGODB_URI);

const createSuperUser = async () => {
  try {
    console.log("==== CREATE SUPERUSER ====");

    const answers = await inquirer.prompt([
      {
        name: "userName",
        message: "Username:",
        type: "input",
        validate: (input) =>
          input ? true : "Username không được để trống!",
      },
      {
        name: "email",
        message: "Email:",
        type: "input",
        validate: (input) =>
          /\S+@\S+\.\S+/.test(input) ? true : "Vui lòng nhập email hợp lệ!",
      },
      {
        name: "fullName",
        message: "Full Name:",
        type: "input",
        validate: (input) =>
          input ? true : "Full Name không được để trống!",
      },
      {
        name: "password",
        message: "Password:",
        type: "password",
        mask: "*",
        validate: (input) =>
          input.length >= 6 ? true : "Mật khẩu phải có ít nhất 6 ký tự!",
      },
      {
        name: "confirm",
        message: "Bạn có chắc chắn muốn tạo tài khoản này?",
        type: "confirm",
        default: true,
      },
    ]);

    if (!answers.confirm) {
      console.log("Hủy tạo tài khoản");
      return;
    }

    const { userName, email, fullName, password } = answers;

    const existingUser = await User.findOne({ $or: [{ email }, { userName }] });

    if (existingUser) {
      console.log(
        "Email hoặc Username đã tồn tại! Hãy chọn thông tin khác."
      );
      return;
    }

    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 2,
    });

    const newSuperUser = new User({
      userName,
      email,
      fullName,
      password: hashedPassword,
      isSuperUser: true,
    });

    await newSuperUser.save();
    console.log("Superuser đã được tạo thành công!");
  } catch (error) {
    console.error("Lỗi khi tạo superuser:", error);
  } finally {
    mongoose.connection.close();
  }
};

createSuperUser();
