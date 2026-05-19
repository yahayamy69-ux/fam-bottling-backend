import User from '../models/User.js';

// Simple authenticated endpoint to credit +₦10 to the requesting user.
export const claimAdd10 = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { totalCashback: 10 } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, message: 'Claim successful', data: { user } });
  } catch (err) {
    console.error('Claim Add10 error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Unable to process claim' });
  }
};

export default { claimAdd10 };
