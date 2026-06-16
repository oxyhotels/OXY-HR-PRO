'use client';

import React, { useState, useEffect } from 'react';
import { Award, AlertTriangle, ShieldCheck, Trophy, Sparkles, Flame, Coins, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { api } from '../../../lib/api';

export default function PerformancePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [levelProgress, setLevelProgress] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileRes, leaderboardRes] = await Promise.all([
          api.get('/gamification/my-profile').catch(err => {
            console.error('Failed to fetch gamification profile', err);
            return null;
          }),
          api.get('/gamification/leaderboard?scope=month&limit=100').catch(err => {
            console.error('Failed to fetch gamification leaderboard', err);
            return null;
          })
        ]);

        if (profileRes && profileRes.status === 'success') {
          setProfile(profileRes.data?.profile || null);
          setLevelProgress(profileRes.data?.levelProgress || null);
        }

        if (leaderboardRes && leaderboardRes.status === 'success') {
          setLeaderboard(leaderboardRes.data?.leaderboard || []);
        }
      } catch (err) {
        console.error('Error fetching performance gamification data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Determine current user rank on the leaderboard
  const userRank = leaderboard.find((entry: any) => entry.employeeId === user?.id)?.rank || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="text-gold animate-bounce" size={24} />
          OXY Operations Gamification Leaderboard
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Compete in the active hotel registry, level up your rank, collect coins, and unlock special achievement badges.
        </p>
      </div>

      {/* Row 1: XP Index Dial / Badges Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {user?.role === 'ROOT_ADMIN' ? (
          <div className="lg:col-span-3 bg-card-dark border border-slate-800/80 rounded-xl p-8 text-center space-y-4 shadow-lg gold-border-glow">
            <Trophy className="text-gold mx-auto" size={48} />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">Root Administrator Overview</h2>
            <p className="text-slate-350 text-xs max-w-2xl mx-auto leading-relaxed">
              As a Root Administrator, individual OPI scoring and personal gamification metrics are not active for your role. 
              You have system-wide rights to monitor hotel performance, review staff analytics, and inspect properties across the chain. 
              Refer to the monthly gamification leaderboard below to inspect current staff standings.
            </p>
          </div>
        ) : (
          <>
            {/* OPI / XP Dial */}
            <div className="bg-card-dark border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between hover:border-gold/30 transition-all gold-border-glow shadow-md">
              <div>
                <h2 className="text-xs font-bold text-gold uppercase tracking-wider mb-1">My Performance Index</h2>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Your gamified level progression and index based on attendance, task closures, and LMS activity.
                </p>
              </div>
              
              <div className="flex flex-col items-center justify-center py-6">
                <div className="relative w-36 h-36 flex items-center justify-center rounded-full border border-dashed border-slate-800">
                  {/* Outer dial ring */}
                  <div className="absolute inset-2 rounded-full border border-gold/25 animate-spin duration-[20s]" />
                  <div className="text-center z-10">
                    <span className="text-3xl font-extrabold text-white">Level {profile?.level || 1}</span>
                    <span className="block text-[9px] uppercase font-bold text-gold tracking-widest mt-1">
                      {profile?.totalXp?.toLocaleString() ?? 0} Total XP
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400 pt-4 border-t border-slate-900">
                <div>
                  <p className="font-semibold text-slate-500 uppercase text-[9px] flex items-center justify-center gap-0.5">
                    <Flame size={10} className="text-orange-500" /> Streak
                  </p>
                  <p className="text-slate-200 mt-1 font-mono font-bold">{profile?.currentStreak ?? 0} Days</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-500 uppercase text-[9px] flex items-center justify-center gap-0.5">
                    <Coins size={10} className="text-gold" /> Coins
                  </p>
                  <p className="text-slate-200 mt-1 font-mono font-bold">{profile?.availableCoins ?? 0}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-500 uppercase text-[9px] flex items-center justify-center gap-0.5">
                    <Award size={10} className="text-sky-400" /> Badges
                  </p>
                  <p className="text-slate-200 mt-1 font-mono font-bold">{profile?.badges?.length || 0}</p>
                </div>
              </div>
            </div>

            {/* Badges Showcase and Milestones */}
            <div className="lg:col-span-2 bg-card-dark border border-slate-800/80 rounded-xl p-6 space-y-5 shadow-md">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xs font-bold text-gold uppercase tracking-wider mb-1">Badges & Milestones</h2>
                  <p className="text-[10px] text-slate-500">Milestone parameters to level up your profile and badges unlocked in operational duty.</p>
                </div>
                {userRank && (
                  <span className="inline-flex items-center gap-1 bg-gold/15 text-gold border border-gold/30 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
                    Rank #{userRank}
                  </span>
                )}
              </div>

              {/* Progress Milestones */}
              <div className="bg-slate-950/30 border border-slate-900 p-4 rounded-xl space-y-3">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">Level Progress (Level {profile?.level || 1} → {profile?.level ? profile.level + 1 : 2})</span>
                  <span className="text-gold font-mono">{levelProgress?.progressPercent ?? 0}%</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-gold to-[#f5d36a] rounded-full" 
                    style={{ width: `${Math.min(Math.max(levelProgress?.progressPercent ?? 0, 0), 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 block font-medium">
                  {(profile?.xpToNextLevel ?? 500).toLocaleString()} XP points needed to unlock next level badge!
                </span>
              </div>

              {/* Badges Grid */}
              <div>
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2.5">Unlocked Achievement Badges</h3>
                {!profile?.badges || profile.badges.length === 0 ? (
                  <div className="text-slate-500 text-xs py-3 bg-slate-950/20 rounded-xl border border-dashed border-slate-900 text-center">
                    No badges unlocked yet. Complete daily checklist check-ins and high-priority tasks to unlock them!
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {profile.badges.map((badge: any, index: number) => (
                      <div 
                        key={badge.id || index}
                        className="bg-slate-950/45 border border-slate-900 hover:border-gold/20 p-2.5 rounded-xl text-center space-y-1.5 transition-all group cursor-default"
                        title={badge.description}
                      >
                        <span className="text-2xl block group-hover:scale-110 transition-transform duration-300">{badge.icon}</span>
                        <div className="text-[10px] font-bold text-white truncate">{badge.name}</div>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider block bg-slate-900 text-slate-400 group-hover:bg-gold/10 group-hover:text-gold transition-all">
                          {badge.tier}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Row 2: Property Leaderboard Ranks */}
      <div className="bg-card-dark border border-slate-800/80 rounded-xl p-6 space-y-4 shadow-md font-sans">
        <div>
          <h2 className="text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} className="text-gold" />
            Property Rankings (Monthly Evaluation)
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Top-ranked employees within your hotel tenant directory based on current month's accumulated gamification XP.
          </p>
        </div>

        <div className="overflow-x-auto">
          {leaderboard.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No performance records found in MongoDB for the current month.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="p-4">Rank / Employee</th>
                  <th className="p-4">Department & Designation</th>
                  <th className="p-4">Current Level</th>
                  <th className="p-4">Monthly XP</th>
                  <th className="p-4">Streak & Coins</th>
                  <th className="p-4">Top Achievement Badge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {leaderboard.map((rec, index) => {
                  const emp = rec.employee || {};
                  const empName = emp.firstName ? `${emp.firstName} ${emp.lastName || ''}` : 'Unknown Staff';
                  
                  return (
                    <tr key={rec.employeeId || index} className="hover:bg-slate-900/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            index === 0 ? 'bg-gold text-slate-dark' : 'bg-slate-800 text-slate-350'
                          }`}>
                            #{index + 1}
                          </div>
                          <div className="flex items-center gap-2">
                            {emp.photoUrl ? (
                              <img src={emp.photoUrl} alt={empName} className="w-6 h-6 rounded-full object-cover border border-slate-700" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-gold">
                                {emp.firstName ? emp.firstName[0] : '?'}
                              </div>
                            )}
                            <div className="font-semibold text-white">{empName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>{emp.department || 'N/A'}</div>
                        <div className="text-slate-500 text-[10px] mt-0.5">{emp.designation || 'N/A'}</div>
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                          Lvl {rec.level || 1}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-200">
                        {rec.monthlyXp?.toLocaleString() ?? 0} XP
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-orange-500 font-semibold block">
                            🔥 {rec.currentStreak || 0}d streak
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            🪙 {rec.totalCoins || 0} coins
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        {rec.topBadge ? (
                          <span className="inline-flex items-center gap-1 bg-slate-900 text-gold border border-gold/15 px-2.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider">
                            <span className="text-xs">{rec.topBadge.icon || '🎖'}</span>
                            {rec.topBadge.name}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
