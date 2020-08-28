import mongoose from 'mongoose';

const accountSchema = mongoose.Schema({
  branchCode: {
    type: Number,
    required: true,
  },
  accountNumber: {
    type: Number,
    required: true,
  },
  accountHolder: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    required: true,
  },
});

const accountModel = mongoose.model('accounts', accountSchema);

export default accountModel;
