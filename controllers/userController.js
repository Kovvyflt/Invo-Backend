const User = require('../models/User');

// GET /api/users  (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get logged-in user profile
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phoneNumber, age, picture } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    let passwordChanged = false;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (age) user.age = age;
    if (picture) user.picture = picture;

    if (password) {
      user.password = password;
      passwordChanged = true;
    }

    await user.save();

    if (passwordChanged) {
      return res.status(200).json({
        message: "✅ Password updated. Please log in again.",
        reauthRequired: true,
      });
    }

    res.json({
      message: "✅ Profile updated successfully!",
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        age: user.age,
        picture: user.picture,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Error in updateMe:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

