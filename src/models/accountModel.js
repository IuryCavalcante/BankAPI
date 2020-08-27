import mongoose from 'mongoose';

const accountSchema = mongoose.Schema({
  branchCode: {
    type: Number,
    require: true,
  },
  accountNumber: {
    type: Number,
    require: true,
  },
  accountHolder: {
    type: String,
    require: true,
  },
  balance: {
    type: Number,
    require: true,
  },
});

const accountModel = mongoose.model('accounts', accountSchema);

export default accountModel;
