import prisma from '../utils/database.js';

import {DEFAULT_CATEGORY, DEFAULT_PAYMENT_OPTION} from '../constants.js';

export const createSplit = async (req, res) => {
    try {
      const {user} = req;

      const {expenseId, shares} = req.body;

      if (!expenseId || !shares) {
        return res.status(400).json({error: 'Missing required fields'});
      }

      const expense = await prisma.expense.findFirst({
        where: {
          id: expenseId,
          userId: user.id,
        },
      });


      if (!expense) {
        return res.status(404).json({error: 'Expense not found'});
      }

      let split = await prisma.split.findFirst({
        where: {
          expenseId: expense.id,
        },
      });


      if (split) {
        return res.status(400).json({error: 'Split already exists for this expense'});
      }

      for (let share of shares) {
        if (share.userId === 'SELF') continue;
        const user = await prisma.user.findFirst({
          where: {
            id: share.userId,
          },
        });

        if (!user) {
          return res.status(404).json({error: 'User not found'});
        }
      }


      await prisma.$transaction(async (tx) => {
        for (let share of shares) {
          if (share.userId === 'SELF') {
            split = await tx.split.create({
              data: {
                share: parseFloat(share.share),
                expenseId: expense.id,
                userId: user.id,
              },
            });

            if (!split) {
              return res.status(500).json({error: 'Internal Server Error'});
            }
            continue;
          }
          const s = await tx.split.create({
            data: {
              share: parseFloat(share.share),
              expenseId: expense.id,
              userId: share.userId,
            },
          });
          if (!s) {
            return res.status(500).json({error: 'Internal Server Error'});
          }
        }
      })

      split = await prisma.split.findMany({
        where: {
          expenseId: expense.id,
        },
      });

      return res.status(200).json({split});
    } catch
      (err) {
      console.error(err);
      return res.status(500).json({error: 'Internal Server Error'});
    }
  }
;

export const getSplits = async (req, res) => {
  try {
    const {user} = req;

    const splits = await prisma.split.findMany({
      where: {
        userId: user.id,
      },
    });

    return res.status(200).json({splits});
  } catch (err) {
    console.error(err);
    return res.status(500).json({error: 'Internal Server Error'});
  }
};

export const getSplitById = async (req, res) => {
  try {
    const {user} = req;

    const {expenseId} = req.params;

    const split = await prisma.split.findFirst({
      where: {
        expenseId: expenseId,
        userId: user.id,
      },
      include: {
        expense: true,
      }
    });

    if (!split) {
      return res.status(404).json({error: 'Split not found'});
    }

    return res.status(200).json({split});
  } catch (err) {
    console.error(err);
    return res.status(500).json({error: 'Internal Server Error'})
  }
}