import { Request, Response, NextFunction } from 'express';
import { GamificationProfile, XpEvent, RewardRedemption } from '@/models/Gamification';
import { getLeaderboardData, processManagerAppreciation } from '@/services/gamification.service';
import { ApiError } from '@/utils/ApiError';
import { LEVEL_THRESHOLDS } from '@/services/gamification.service';

// ─────────────────────────────────────────────
//  GET /api/gamification/leaderboard?scope=today|week|month|quarter|year|alltime&limit=50
// ─────────────────────────────────────────────
export const getGamificationLeaderboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const scope = (req.query.scope as 'today' | 'week' | 'month' | 'quarter' | 'year' | 'alltime' | 'monthly') || 'monthly';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    // ROOT_ADMIN sees all hotels; others see their hotel only
    const hotelId = req.user?.role === 'ROOT_ADMIN' ? null : req.user?.hotel?.toString() || null;

    const profiles = await getLeaderboardData(hotelId, scope, limit);

    const leaderboard = profiles.map((p, index) => ({
      rank: index + 1,
      employeeId: (p.employee as any)?._id,
      name: `${(p.employee as any)?.firstName} ${(p.employee as any)?.lastName}`,
      email: (p.employee as any)?.email,
      department: (p.employee as any)?.department,
      designation: (p.employee as any)?.designation,
      photoUrl: (p.employee as any)?.photoUrl,
      hotel: (p.employee as any)?.hotel,
      level: p.level,
      totalXp: p.totalXp,
      monthlyXp: p.monthlyXp,
      totalCoins: p.totalCoins,
      totalStars: p.totalStars,
      currentStreak: p.currentStreak,
      longestStreak: p.longestStreak,
      badgeCount: p.badges.length,
      topBadge: p.badges[p.badges.length - 1] || null,
      xpToNextLevel: p.xpToNextLevel,
    }));

    res.status(200).json({
      status: 'success',
      data: { leaderboard, scope },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  GET /api/gamification/profile/:userId
// ─────────────────────────────────────────────
export const getGamificationProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetId = req.params.userId || req.user?.id;

    // Permissions: Employees can only see their own, managers can see their team
    if (
      req.user?.role === 'EMPLOYEE' &&
      targetId !== req.user?.id
    ) {
      throw new ApiError(403, 'Access denied');
    }

    const profile = await GamificationProfile.findOne({ employee: targetId })
      .populate({ path: 'employee', select: 'firstName lastName email department designation photoUrl' });

    if (!profile) {
      // Return empty profile object rather than 404
      res.status(200).json({
        status: 'success',
        data: {
          profile: {
            totalXp: 0,
            totalCoins: 0,
            totalStars: 0,
            level: 1,
            xpToNextLevel: LEVEL_THRESHOLDS[1],
            currentStreak: 0,
            longestStreak: 0,
            badges: [],
            monthlyXp: 0,
            monthlyCoins: 0,
            availableCoins: 0,
            redeemedCoins: 0,
          },
        },
      });
      return;
    }

    // Attach level thresholds for UI progress bars
    const currentLevelThreshold = LEVEL_THRESHOLDS[profile.level - 1] || 0;
    const nextLevelThreshold = LEVEL_THRESHOLDS[profile.level] || LEVEL_THRESHOLDS[9];

    res.status(200).json({
      status: 'success',
      data: {
        profile,
        levelProgress: {
          currentLevelThreshold,
          nextLevelThreshold,
          progressPercent: Math.round(
            ((profile.totalXp - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100
          ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  GET /api/gamification/activity?limit=20
// ─────────────────────────────────────────────
export const getActivityFeed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const hotelId = req.user?.role === 'ROOT_ADMIN' ? null : req.user?.hotel?.toString();

    const query: any = {};
    if (hotelId) query.hotel = hotelId;

    // For employees, only show their own activity
    if (req.user?.role === 'EMPLOYEE') {
      query.employee = req.user?.id;
    }

    const events = await XpEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({ path: 'employee', select: 'firstName lastName photoUrl department' });

    res.status(200).json({
      status: 'success',
      data: { events },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  GET /api/gamification/my-profile
// ─────────────────────────────────────────────
export const getMyGamificationProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  req.params.userId = req.user?.id || '';
  return getGamificationProfile(req, res, next);
};

// ─────────────────────────────────────────────
//  POST /api/gamification/appreciate — Manager appreciates employee
// ─────────────────────────────────────────────
export const appreciateEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(req.user?.role || '')) {
      throw new ApiError(403, 'Only managers can appreciate employees');
    }

    const { employeeId } = req.body;
    if (!employeeId) throw new ApiError(400, 'employeeId is required');

    const profile = await GamificationProfile.findOne({ employee: employeeId });
    const hotelId = profile?.hotel || req.user?.hotel;

    if (!hotelId) throw new ApiError(400, 'Cannot determine hotel for this employee');

    const result = await processManagerAppreciation(employeeId, hotelId.toString());

    res.status(200).json({
      status: 'success',
      message: 'Employee appreciated! XP and coins awarded.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  POST /api/gamification/redeem — Redeem coins for reward
// ─────────────────────────────────────────────
export const redeemReward = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rewardType, rewardTitle, coinsToSpend } = req.body;

    if (!rewardType || !rewardTitle || !coinsToSpend) {
      throw new ApiError(400, 'rewardType, rewardTitle, and coinsToSpend are required');
    }

    const profile = await GamificationProfile.findOne({ employee: req.user?.id });
    if (!profile) throw new ApiError(404, 'Gamification profile not found');

    if (profile.availableCoins < coinsToSpend) {
      throw new ApiError(400, `Insufficient coins. You have ${profile.availableCoins} coins available.`);
    }

    // Deduct coins
    profile.availableCoins -= coinsToSpend;
    profile.redeemedCoins += coinsToSpend;
    await profile.save();

    // Create redemption record
    const redemption = await RewardRedemption.create({
      employee: req.user?.id,
      hotel: profile.hotel,
      rewardType,
      rewardTitle,
      coinsSpent: coinsToSpend,
      status: 'Pending',
    });

    res.status(201).json({
      status: 'success',
      message: 'Reward redemption request submitted!',
      data: { redemption, remainingCoins: profile.availableCoins },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  GET /api/gamification/redemptions — Manager: see all redemptions for hotel
// ─────────────────────────────────────────────
export const getRedemptions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotelId = req.user?.role === 'ROOT_ADMIN' ? null : req.user?.hotel?.toString();
    const query: any = {};
    if (hotelId) query.hotel = hotelId;
    if (req.user?.role === 'EMPLOYEE') query.employee = req.user?.id;

    const redemptions = await RewardRedemption.find(query)
      .sort({ createdAt: -1 })
      .populate({ path: 'employee', select: 'firstName lastName department designation' });

    res.status(200).json({
      status: 'success',
      data: { redemptions },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  PATCH /api/gamification/redemptions/:id — Approve/reject redemption
// ─────────────────────────────────────────────
export const updateRedemptionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role === 'EMPLOYEE') throw new ApiError(403, 'Access denied');

    const { status, notes } = req.body;
    const redemption = await RewardRedemption.findByIdAndUpdate(
      req.params.id,
      { status, notes, approvedBy: req.user?.id, approvedAt: new Date() },
      { new: true }
    );

    if (!redemption) throw new ApiError(404, 'Redemption not found');

    // If rejected, refund coins
    if (status === 'Rejected') {
      await GamificationProfile.findOneAndUpdate(
        { employee: redemption.employee },
        { $inc: { availableCoins: redemption.coinsSpent, redeemedCoins: -redemption.coinsSpent } }
      );
    }

    res.status(200).json({ status: 'success', data: { redemption } });
  } catch (error) {
    next(error);
  }
};
