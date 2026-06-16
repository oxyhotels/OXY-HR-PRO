import { GamificationProfile, XpEvent, IBadge, XpEventType } from '@/models/Gamification';
import { Schema } from 'mongoose';

// ─────────────────────────────────────────────
//  XP / COIN CONFIG TABLE
// ─────────────────────────────────────────────
export const XP_CONFIG: Record<XpEventType, { xp: number; coins: number; stars: number; label: string }> = {
  ATTENDANCE_PRESENT:       { xp: 10,  coins: 5,   stars: 0, label: '✅ Check-in completed'              },
  ATTENDANCE_CHECK_OUT:      { xp: 10,  coins: 5,   stars: 0, label: '✅ Check-out completed'             },
  ATTENDANCE_PERFECT_DAY:    { xp: 25,  coins: 15,  stars: 1, label: '🌟 Perfect attendance day'          },
  ATTENDANCE_EARLY:          { xp: 10,  coins: 5,   stars: 1, label: '⚡ Early check-in bonus'           },
  ATTENDANCE_STREAK_3:       { xp: 30,  coins: 15,  stars: 1, label: '🔥 3-day streak!'                   },
  ATTENDANCE_STREAK_7:       { xp: 75,  coins: 30,  stars: 2, label: '🔥🔥 7-day streak!'                 },
  ATTENDANCE_STREAK_15:      { xp: 150, coins: 60,  stars: 3, label: '💥 15-day streak!'                  },
  ATTENDANCE_STREAK_30:      { xp: 300, coins: 120, stars: 5, label: '🏅 30-day streak legend!'           },
  ATTENDANCE_STREAK_60:      { xp: 600, coins: 250, stars: 7, label: '🥇 60-day elite streak!'            },
  ATTENDANCE_STREAK_100:     { xp: 1000,coins: 500, stars: 10,label: '💎 100-day CHAMPION!'              },
  TASK_COMPLETED:           { xp: 20,  coins: 10,  stars: 0, label: '✔ Task completed'                  },
  TASK_HIGH_PRIORITY:       { xp: 25,  coins: 12,  stars: 1, label: '🚨 High-priority task done!'        },
  TASK_BEFORE_DEADLINE:     { xp: 40,  coins: 25,  stars: 1, label: '⏰ Task completed before deadline' },
  LMS_MODULE_WATCHED:       { xp: 15,  coins: 7,   stars: 0, label: '📚 LMS module completed'            },
  LMS_COURSE_COMPLETED:     { xp: 50,  coins: 30,  stars: 1, label: '🎓 LMS course completed'            },
  LMS_CERTIFICATION_EARNED: { xp: 80,  coins: 40,  stars: 2, label: '🏆 Certification earned'             },
  QUIZ_PASS:                { xp: 35,  coins: 20,  stars: 1, label: '✅ Quiz passed'                     },
  WORK_REPORT_SUBMITTED:    { xp: 15,  coins: 10,  stars: 0, label: '📝 Work report submitted'           },
  POSITIVE_GUEST_REVIEW:    { xp: 100, coins: 50,  stars: 2, label: '🌟 Positive guest review'          },
  MANAGER_APPRECIATION:     { xp: 150, coins: 100, stars: 2, label: '⭐ Manager appreciation'            },
  LEVEL_UP:                 { xp: 0,   coins: 50,  stars: 2, label: '🆙 Level up!'                      },
  BADGE_EARNED:             { xp: 0,   coins: 20,  stars: 1, label: '🎖 New badge unlocked!'             },
};

// ─────────────────────────────────────────────
//  LEVEL THRESHOLDS (XP required for each level)
// ─────────────────────────────────────────────
export const LEVEL_THRESHOLDS = [0, 500, 1200, 2500, 4500, 7500, 11500, 17000, 25000, 36000, 50000];

export function computeLevel(totalXp: number): { level: number; xpToNextLevel: number } {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  level = Math.min(level, 10);
  const nextThreshold = LEVEL_THRESHOLDS[Math.min(level, 9)];
  const xpToNextLevel = level < 10 ? Math.max(0, nextThreshold - totalXp) : 0;
  return { level, xpToNextLevel };
}

// ─────────────────────────────────────────────
//  BADGE DEFINITIONS
// ─────────────────────────────────────────────
const BADGE_DEFINITIONS: IBadge[] = [
  { id: 'first_checkin',        name: 'Attendance King',      icon: '👑',  description: 'Checked in for the first full day',                        earnedAt: new Date(), tier: 'Bronze'   },
  { id: 'consistency_champion', name: 'Consistency Champion', icon: '🔥',  description: 'Maintained an attendance streak of 7 days',                 earnedAt: new Date(), tier: 'Silver'   },
  { id: 'workhorse',           name: 'Workhorse',            icon: '💪',  description: 'Completed 30 days of steady attendance',                   earnedAt: new Date(), tier: 'Gold'     },
  { id: 'hotel_star',          name: 'Hotel Star',           icon: '🌟',  description: 'Top performer inside your hotel',                          earnedAt: new Date(), tier: 'Gold'     },
  { id: 'task_master',         name: 'Task Master',          icon: '⚡',  description: 'Completed 50 tasks',                                       earnedAt: new Date(), tier: 'Silver'   },
  { id: 'learning_champion',   name: 'Learning Champion',    icon: '🎓',  description: 'Completed 5 LMS courses',                                  earnedAt: new Date(), tier: 'Silver'   },
  { id: 'fast_learner',        name: 'Fast Learner',         icon: '🚀',  description: 'Passed a quiz right after training',                      earnedAt: new Date(), tier: 'Silver'   },
  { id: 'guest_hero',          name: 'Guest Delight Hero',   icon: '💖',  description: 'Received a positive guest review',                         earnedAt: new Date(), tier: 'Gold'     },
  { id: 'top_performer',       name: 'Top Performer',        icon: '🏅',  description: 'Reached Level 7 and elite XP status',                      earnedAt: new Date(), tier: 'Platinum' },
  { id: 'oxy_legend',          name: 'OXY Legend',           icon: '💎',  description: 'Reached Level 10 and earned Grand Champion status',        earnedAt: new Date(), tier: 'Diamond'  },
  { id: 'coin_collector',      name: 'Coin Collector',       icon: '🪙',  description: 'Collected 500 total coins',                                earnedAt: new Date(), tier: 'Bronze'   },
  { id: 'appreciated',         name: 'Recognized',           icon: '🌹',  description: 'Received manager appreciation',                             earnedAt: new Date(), tier: 'Bronze'   },
];

// ─────────────────────────────────────────────
//  CORE: Award XP to an employee
// ─────────────────────────────────────────────
export async function awardXp(
  employeeId: Schema.Types.ObjectId | string,
  hotelId: Schema.Types.ObjectId | string,
  eventType: XpEventType,
  overrideDescription?: string
): Promise<{ profile: any; newBadges: IBadge[]; leveledUp: boolean }> {
  const config = XP_CONFIG[eventType];
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Log XP event
  await XpEvent.create({
    employee: employeeId,
    hotel: hotelId,
    eventType,
    xpEarned: config.xp,
    coinsEarned: config.coins,
    starsEarned: config.stars,
    description: overrideDescription || config.label,
    date: today,
    month,
    year,
  });

  // Fetch or initialize profile
  let profile = await GamificationProfile.findOne({ employee: employeeId });
  if (!profile) {
    profile = await GamificationProfile.create({
      employee: employeeId,
      hotel: hotelId,
      totalXp: 0,
      totalCoins: 0,
      totalStars: 0,
      level: 1,
      xpToNextLevel: LEVEL_THRESHOLDS[1],
      currentStreak: 0,
      longestStreak: 0,
      lastAttendanceDate: '',
      badges: [],
      monthlyXp: 0,
      monthlyCoins: 0,
      currentMonth: month,
      currentYear: year,
      availableCoins: 0,
      redeemedCoins: 0,
    });
  }

  // Reset monthly counters if month changed
  if (profile.currentMonth !== month || profile.currentYear !== year) {
    profile.monthlyXp = 0;
    profile.monthlyCoins = 0;
    profile.currentMonth = month;
    profile.currentYear = year;
  }

  const prevLevel = profile.level;

  // Apply XP and coins
  profile.totalXp += config.xp;
  profile.totalCoins += config.coins;
  profile.totalStars += config.stars;
  profile.monthlyXp += config.xp;
  profile.monthlyCoins += config.coins;
  profile.availableCoins += config.coins;

  // Recompute level
  const { level, xpToNextLevel } = computeLevel(profile.totalXp);
  profile.level = level;
  profile.xpToNextLevel = xpToNextLevel;

  const leveledUp = level > prevLevel;

  // Award level-up bonus coins
  if (leveledUp) {
    profile.totalCoins += XP_CONFIG.LEVEL_UP.coins;
    profile.availableCoins += XP_CONFIG.LEVEL_UP.coins;
    await XpEvent.create({
      employee: employeeId,
      hotel: hotelId,
      eventType: 'LEVEL_UP',
      xpEarned: 0,
      coinsEarned: XP_CONFIG.LEVEL_UP.coins,
      starsEarned: XP_CONFIG.LEVEL_UP.stars,
      description: `🆙 Leveled up to Level ${level}!`,
      date: today,
      month,
      year,
    });
  }

  // ── Badge engine ──
  const newBadges: IBadge[] = [];
  const existingBadgeIds = profile.badges.map((b: IBadge) => b.id);

  const checkAndAwardBadge = (badgeId: string) => {
    if (!existingBadgeIds.includes(badgeId)) {
      const badge = BADGE_DEFINITIONS.find((b) => b.id === badgeId);
      if (badge) {
        const earned: IBadge = { ...badge, earnedAt: new Date() };
        profile!.badges.push(earned);
        newBadges.push(earned);
        existingBadgeIds.push(badgeId);
      }
    }
  };

  // Level badges
  if (level >= 7)  checkAndAwardBadge('top_performer');
  if (level >= 10) checkAndAwardBadge('oxy_legend');

  // Coin badges
  if (profile.totalCoins >= 500) checkAndAwardBadge('coin_collector');

  // Event-specific badges
  if (eventType === 'ATTENDANCE_PRESENT' && profile.currentStreak >= 1) checkAndAwardBadge('first_checkin');
  if (eventType === 'ATTENDANCE_STREAK_7')   checkAndAwardBadge('consistency_champion');
  if (eventType === 'ATTENDANCE_STREAK_30')  checkAndAwardBadge('workhorse');
  if (eventType === 'ATTENDANCE_STREAK_100') checkAndAwardBadge('hotel_star');
  if (eventType === 'MANAGER_APPRECIATION')  checkAndAwardBadge('appreciated');
  if (eventType === 'POSITIVE_GUEST_REVIEW') checkAndAwardBadge('guest_hero');
  if (eventType === 'LMS_COURSE_COMPLETED')  checkAndAwardBadge('learning_champion');
  if (eventType === 'TASK_BEFORE_DEADLINE')  checkAndAwardBadge('task_master');
  if (eventType === 'QUIZ_PASS')             checkAndAwardBadge('fast_learner');

  await profile.save();
  return { profile, newBadges, leveledUp };
}

export async function processAttendanceCheckout(
  employeeId: Schema.Types.ObjectId | string,
  hotelId: Schema.Types.ObjectId | string,
  attendanceStatus: string
): Promise<void> {
  await awardXp(employeeId, hotelId, 'ATTENDANCE_CHECK_OUT');
  if (attendanceStatus === 'Present') {
    await awardXp(employeeId, hotelId, 'ATTENDANCE_PERFECT_DAY');
  }
}

export type LeaderboardScope = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'alltime';

export function getScopeDateRange(scope: LeaderboardScope) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (scope) {
    case 'today':
      break;
    case 'week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      end.setDate(diff + 6);
      break;
    }
    case 'month':
      start.setDate(1);
      end.setMonth(now.getMonth() + 1, 0);
      break;
    case 'quarter': {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      end.setMonth(quarterStartMonth + 3, 0);
      break;
    }
    case 'year':
      start.setMonth(0, 1);
      end.setMonth(11, 31);
      break;
    case 'alltime':
      start.setFullYear(1970, 0, 1);
      end.setFullYear(9999, 11, 31);
      break;
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

// ─────────────────────────────────────────────
//  STREAK ENGINE — called on attendance check-in
// ─────────────────────────────────────────────
export async function processAttendanceStreak(
  employeeId: Schema.Types.ObjectId | string,
  hotelId: Schema.Types.ObjectId | string,
  isEarly: boolean
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  let profile = await GamificationProfile.findOne({ employee: employeeId });
  if (!profile) {
    profile = await GamificationProfile.create({
      employee: employeeId,
      hotel: hotelId,
      totalXp: 0,
      totalCoins: 0,
      totalStars: 0,
      level: 1,
      xpToNextLevel: LEVEL_THRESHOLDS[1],
      currentStreak: 0,
      longestStreak: 0,
      lastAttendanceDate: '',
      badges: [],
      monthlyXp: 0,
      monthlyCoins: 0,
      currentMonth: new Date().getMonth() + 1,
      currentYear: new Date().getFullYear(),
      availableCoins: 0,
      redeemedCoins: 0,
    });
  }

  // Skip duplicate processing for same day
  if (profile.lastAttendanceDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (profile.lastAttendanceDate === yesterdayStr) {
    profile.currentStreak += 1;
  } else {
    // Streak broken — reset
    profile.currentStreak = 1;
  }

  if (profile.currentStreak > profile.longestStreak) {
    profile.longestStreak = profile.currentStreak;
  }

  profile.lastAttendanceDate = today;
  await profile.save();

  // Base XP for being present
  await awardXp(employeeId, hotelId, 'ATTENDANCE_PRESENT');

  // Early bird bonus
  if (isEarly) {
    await awardXp(employeeId, hotelId, 'ATTENDANCE_EARLY');
  }

  // Streak milestones
  const streakMilestones: [number, XpEventType][] = [
    [3, 'ATTENDANCE_STREAK_3'],
    [7, 'ATTENDANCE_STREAK_7'],
    [15, 'ATTENDANCE_STREAK_15'],
    [30, 'ATTENDANCE_STREAK_30'],
    [60, 'ATTENDANCE_STREAK_60'],
    [100, 'ATTENDANCE_STREAK_100'],
  ];

  for (const [days, eventType] of streakMilestones) {
    if (profile.currentStreak === days) {
      await awardXp(employeeId, hotelId, eventType);
    }
  }
}

// ─────────────────────────────────────────────
//  TASK COMPLETION — called when task status → Completed
// ─────────────────────────────────────────────
export async function processTaskCompletion(
  employeeId: Schema.Types.ObjectId | string,
  hotelId: Schema.Types.ObjectId | string,
  isHighPriority: boolean,
  isBeforeDeadline: boolean
): Promise<void> {
  await awardXp(employeeId, hotelId, 'TASK_COMPLETED');
  if (isHighPriority)    await awardXp(employeeId, hotelId, 'TASK_HIGH_PRIORITY');
  if (isBeforeDeadline)  await awardXp(employeeId, hotelId, 'TASK_BEFORE_DEADLINE');
}

// ─────────────────────────────────────────────
//  LMS EVENTS
// ─────────────────────────────────────────────
export async function processLmsModuleWatched(
  employeeId: Schema.Types.ObjectId | string,
  hotelId: Schema.Types.ObjectId | string
): Promise<void> {
  await awardXp(employeeId, hotelId, 'LMS_MODULE_WATCHED');
}

export async function processLmsCourseCompleted(
  employeeId: Schema.Types.ObjectId | string,
  hotelId: Schema.Types.ObjectId | string
): Promise<void> {
  await awardXp(employeeId, hotelId, 'LMS_COURSE_COMPLETED');
}

export async function processLmsCertificationEarned(
  employeeId: Schema.Types.ObjectId | string,
  hotelId: Schema.Types.ObjectId | string
): Promise<void> {
  await awardXp(employeeId, hotelId, 'LMS_CERTIFICATION_EARNED');
}

// ─────────────────────────────────────────────
//  WORK REPORT / MANAGER APPRECIATION
// ─────────────────────────────────────────────
export async function processWorkReport(
  employeeId: Schema.Types.ObjectId | string,
  hotelId: Schema.Types.ObjectId | string
): Promise<void> {
  await awardXp(employeeId, hotelId, 'WORK_REPORT_SUBMITTED');
}

export async function processManagerAppreciation(
  employeeId: Schema.Types.ObjectId | string,
  hotelId: Schema.Types.ObjectId | string
): Promise<void> {
  await awardXp(employeeId, hotelId, 'MANAGER_APPRECIATION');
}

// ─────────────────────────────────────────────
//  LEADERBOARD QUERY
// ─────────────────────────────────────────────
export async function getLeaderboardData(
  hotelId: string | null,
  scope: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'alltime' | 'monthly' = 'monthly',
  limit = 50
) {
  const normalizedScope = scope === 'monthly' ? 'month' : scope;

  if (normalizedScope === 'alltime') {
    const sortField = 'totalXp';
    const query = hotelId ? { hotel: hotelId } : {};

    return await GamificationProfile.find(query)
      .sort({ [sortField]: -1 })
      .limit(limit)
      .populate({
        path: 'employee',
        select: 'firstName lastName email department designation photoUrl level',
        populate: { path: 'hotel', select: 'name hotelCode' },
      });
  }

  const { startDate, endDate } = getScopeDateRange(normalizedScope as LeaderboardScope);
  const match: any = {
    date: { $gte: startDate, $lte: endDate },
  };
  if (hotelId) match.hotel = hotelId;

  const leaderboard = await XpEvent.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$employee',
        hotel: { $first: '$hotel' },
        xp: { $sum: '$xpEarned' },
        coins: { $sum: '$coinsEarned' },
        stars: { $sum: '$starsEarned' },
        lastEvent: { $max: '$createdAt' },
      },
    },
    { $sort: { xp: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'employee',
      },
    },
    { $unwind: '$employee' },
    {
      $lookup: {
        from: 'hotels',
        localField: 'hotel',
        foreignField: '_id',
        as: 'hotel',
      },
    },
    { $unwind: { path: '$hotel', preserveNullAndEmptyArrays: true } },
  ]);

  return leaderboard.map((entry: any) => ({
    employee: entry.employee,
    hotel: entry.hotel,
    totalXp: entry.xp,
    monthlyXp: entry.xp,
    totalCoins: entry.coins,
    totalStars: entry.stars,
    currentStreak: 0,
    longestStreak: 0,
    badges: entry.employee.badges || [],
    level: entry.employee.level || 1,
    xpToNextLevel: entry.employee.xpToNextLevel || LEVEL_THRESHOLDS[1],
  }));
}
