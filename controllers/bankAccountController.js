import BankAccount from '../models/BankAccount.js';
import User from '../models/User.js';

// Submit or update bank account details
export const submitBankAccount = async (req, res) => {
  try {
    const { accountHolderName, accountNumber, bankName, bankCode, accountType } = req.body;
    const userId = req.user.id;

    // Validation
    if (!accountHolderName || !accountNumber || !bankName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide account holder name, account number, and bank name'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if bank account already exists for this user
    let bankAccount = await BankAccount.findOne({ userId });

    if (bankAccount) {
      // Update existing account
      bankAccount.accountHolderName = accountHolderName;
      bankAccount.accountNumber = accountNumber;
      bankAccount.bankName = bankName;
      bankAccount.bankCode = bankCode || bankAccount.bankCode;
      bankAccount.accountType = accountType || bankAccount.accountType;
      bankAccount.updatedAt = new Date();
      bankAccount.isVerified = false; // Reset verification on update
      
      await bankAccount.save();
      console.log('✅ Bank account updated:', userId);
    } else {
      // Create new account
      bankAccount = await BankAccount.create({
        userId,
        accountHolderName,
        accountNumber,
        bankName,
        bankCode: bankCode || '',
        accountType: accountType || 'savings'
      });
      console.log('✅ Bank account created:', userId);
    }

    res.status(200).json({
      success: true,
      message: bankAccount.createdAt === bankAccount.updatedAt ? 'Bank account created successfully' : 'Bank account updated successfully',
      data: {
        accountHolderName: bankAccount.accountHolderName,
        accountNumber: bankAccount.accountNumber.slice(-4).padStart(bankAccount.accountNumber.length, '*'), // Mask account number
        bankName: bankAccount.bankName,
        accountType: bankAccount.accountType,
        isVerified: bankAccount.isVerified
      }
    });
  } catch (err) {
    console.error('Error submitting bank account:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to submit bank account'
    });
  }
};

// Get user's bank account details
export const getBankAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const bankAccount = await BankAccount.findOne({ userId }).select('-accountNumber');

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: 'No bank account details found'
      });
    }

    res.status(200).json({
      success: true,
      data: bankAccount
    });
  } catch (err) {
    console.error('Error fetching bank account:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Admin: Get all users with bank accounts and their cashback
export const getAllUserBankAccounts = async (req, res) => {
  try {
    // Verify user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized. Admin access required.'
      });
    }

    // Fetch all bank accounts with user details
    const bankAccounts = await BankAccount.find()
      .populate('userId', 'name email totalCashback isReturning')
      .sort({ createdAt: -1 });

    const accountsData = bankAccounts.map(account => ({
      bankAccountId: account._id,
      userId: account.userId._id,
      userName: account.userId.name,
      userEmail: account.userId.email,
      totalCashback: account.userId.totalCashback,
      accountHolderName: account.accountHolderName,
      accountNumber: account.accountNumber, // Full number for admin
      bankName: account.bankName,
      accountType: account.accountType,
      isVerified: account.isVerified,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    }));

    res.status(200).json({
      success: true,
      count: accountsData.length,
      data: accountsData
    });
  } catch (err) {
    console.error('Error fetching bank accounts:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Admin: Mark payment as processed
export const markPaymentProcessed = async (req, res) => {
  try {
    const { bankAccountId, amountPaid } = req.body;
    const adminId = req.user.id;

    // Verify user is admin
    const admin = await User.findById(adminId);
    if (admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized. Admin access required.'
      });
    }

    if (!bankAccountId || !amountPaid) {
      return res.status(400).json({
        success: false,
        message: 'Please provide bank account ID and amount paid'
      });
    }

    const bankAccount = await BankAccount.findByIdAndUpdate(
      bankAccountId,
      { isVerified: true },
      { new: true }
    ).populate('userId', 'name email totalCashback');

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }

    console.log(`✅ Payment marked as processed for ${bankAccount.userId.name}: ₦${amountPaid}`);

    res.status(200).json({
      success: true,
      message: `Payment of ₦${amountPaid} marked as processed for ${bankAccount.userId.name}`,
      data: {
        userName: bankAccount.userId.name,
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        amountPaid
      }
    });
  } catch (err) {
    console.error('Error marking payment:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
