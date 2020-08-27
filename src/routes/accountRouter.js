import express from 'express';
import accountModel from '../models/accountModel.js';
import { promises as fs } from 'fs';

const router = express.Router();

const TRANSFER_FEE = 8;
const WITHDRAWAL_FEE = 1;

router.post('/', async (req, res, next) => {
  try {
    const { branchCode, accountNumber, accountHolder, balance } = req.body;

    if (!branchCode || !accountNumber || !accountHolder || balance == null) {
      throw new Error('Campos obrigatórios');
    }

    const account = new accountModel({
      branchCode,
      accountNumber,
      accountHolder,
      balance,
    });

    await account.save();
    res.send(account);
  } catch (err) {
    next(err);
  }
});
router.get('/richest/', async (req, res, next) => {
  try {
    let top = req.query.top;
    if (!top) {
      top = 10;
    }

    const accounts = await accountModel
      .find()
      .sort({ balance: -1, accountHolder: 1 })
      .limit(Number(top));

    res.send(accounts);
  } catch (error) {
    next(error);
  }
});
router.get('/poorest/', async (req, res, next) => {
  try {
    let top = req.query.top;
    if (!top) {
      top = 10;
    }

    const accounts = await accountModel
      .find()
      .sort({ balance: 1, accountHolder: 1 })
      .limit(Number(top));

    res.send(accounts);
  } catch (error) {
    next(error);
  }
});
router.get('/checkBalance/', async (req, res, next) => {
  try {
    const { branchCode, accountNumber } = req.body;
    const account = await validateAccount(branchCode, accountNumber);

    res.send({ balance: account.balance });
  } catch (error) {
    next(error);
  }
});
router.get('/averageBalance/', async (req, res, next) => {
  try {
    const branchCode = Number(req.query.branchCode);

    const averageBalance = await accountModel.aggregate([
      {
        $match: {
          branchCode: { $eq: branchCode },
        },
      },
      {
        $group: {
          _id: '$branchCode',
          balance: {
            $avg: '$balance',
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]);
    if (averageBalance.length === 0) {
      throw new Error('agencia nao encontrada');
    }
    res.send(averageBalance);
  } catch (error) {
    next(error);
  }
});
router.get('/', async (req, res, next) => {
  try {
    let accounts = await accountModel.find({});

    // initial data
    if (accounts.length === 0) {
      const data = JSON.parse(await fs.readFile('./data/accounts.json'));

      await accountModel.insertMany(data);
      global.logger.info('DATABASE Populated');
      accounts = data;
    }

    res.send(accounts);
  } catch (err) {
    next(err);
  }
});
router.put('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;

    const account = await accountModel.findByIdAndUpdate(
      { _id: id },
      req.body,
      {
        new: true,
      }
    );

    res.send(account);
  } catch (err) {
    next(err);
  }
});
router.delete('/bankruptcy/', async (req, res, next) => {
  //clean database
  try {
    await accountModel.deleteMany({});
    global.logger.info('DATABASE Cleaned');
    res.end();
  } catch (err) {
    next(err);
  }
});
router.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    await accountModel.findByIdAndDelete({ _id: id });

    res.end();
  } catch (err) {
    next(err);
  }
});
router.delete('/', async (req, res, next) => {
  try {
    const { branchCode, accountNumber } = req.body;
    const account = await validateAccount(branchCode, accountNumber);
    await accountModel.findByIdAndDelete({ _id: account._id });

    const countBranches = await accountModel.aggregate([
      {
        $match: {
          branchCode: { $eq: branchCode },
        },
      },
      {
        $group: {
          _id: '$branchCode',
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    res.send(countBranches);
  } catch (err) {
    next(err);
  }
});
router.patch('/transaction/', async (req, res, next) => {
  try {
    const { branchCode, accountNumber, type, value } = req.body;
    let account = await validateAccount(branchCode, accountNumber);

    switch (type) {
      case 'deposit':
      case 'D':
        account.balance += value;
        break;

      case 'withdraw':
      case 'W':
        if (account.balance < value + WITHDRAWAL_FEE) {
          throw new Error('saldo insuficiente');
        }
        account.balance -= value + WITHDRAWAL_FEE;
        break;
    }

    const newTransaction = new accountModel(account);
    newTransaction.save();
    res.send(newTransaction);
  } catch (error) {
    next(error);
  }
});
router.patch('/transfer/', async (req, res, next) => {
  try {
    const {
      branchCodeSource,
      accountNumberSource,
      branchCodeTarget,
      accountNumberTarget,
      value,
    } = req.body;
    if (value < 0) {
      throw new Error('O valor para transferência é inválido');
    }

    let accountSource = await validateAccount(
      branchCodeSource,
      accountNumberSource
    );
    let accountTarget = await validateAccount(
      branchCodeTarget,
      accountNumberTarget
    );

    if (accountTarget.branchCode !== accountSource.branchCode) {
      accountSource.balance -= TRANSFER_FEE;
    }

    accountSource.balance -= value;

    if (accountSource.balance < 0) {
      throw new Error(
        'O saldo da conta é insuficiente para efetuar a transferência'
      );
    }

    accountTarget.balance += value;

    accountSource = new accountModel(accountSource);
    accountSource.save();

    accountTarget = new accountModel(accountTarget);
    accountTarget.save();

    res.send(accountSource);
  } catch (error) {
    next(error);
  }
});
router.patch('/moveToEspecialBranch/', async (req, res, next) => {
  try {
    let accountsTransfered = [];
    let accounts = await accountModel.aggregate([
      {
        $match: { branchCode: { $ne: 99 } },
      },
      {
        $group: {
          _id: '$branchCode',
          balance: { $max: '$balance' },
        },
      },
    ]);

    for (const account of accounts) {
      const { _id, balance } = account;
      let newAccount = await accountModel.findOne({
        branchCode: _id,
        balance,
      });
      accountsTransfered.push(newAccount);

      newAccount.branchCode = 99;
      newAccount.save();
    }

    res.send(accountsTransfered);
  } catch (error) {
    next(error);
  }
});

router.use((err, req, res, next) => {
  global.logger.error(`${req.method} ${req.baseUrl} : ${err.message}`);
  res.status(500).send({ error: err.message });
});

export default router;

const validateAccount = async (branchCode, accountNumber) => {
  try {
    if (branchCode) {
      const account = await accountModel.findOne({ branchCode, accountNumber });

      if (!account) {
        throw new Error(
          `(${branchCode}/${accountNumber}) Agência/Conta inválida`
        );
      }
      return account;
    } else {
      const account = await accountModel.findOne({ accountNumber });

      if (!account) {
        throw new Error(
          `(${accountNumber}) essa conta não existe em nenhuma agência`
        );
      }
      return account;
    }
  } catch (error) {
    throw new Error(error.message);
  }
};
