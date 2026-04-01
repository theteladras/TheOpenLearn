/** Raw stats used to compare learners and draw the skill radar. */

export type CommunityMemberStats = {
  userId: string;
  displayName: string | null;
  publicBio: string | null;
  xpTotal: number;
  streakDays: number;
  createdAt: Date;
  tasksDone: number;
  challengeXp: number;
  topicBreadth: number;
  achCount: number;
  roadmapsDone: number;
};

export type SkillRadarAxes = {
  /** Lessons completed (volume). */
  volume: number;
  /**
   * Average XP weight per finished lesson — proxy for path difficulty / depth
   * (tasks can carry different `xpReward` from generation).
   */
  rigor: number;
  /** Distinct topic clusters touched. */
  breadth: number;
  /** Streak + achievement signal. */
  drive: number;
  /** Finished roadmaps and badges. */
  mastery: number;
};

function linNorm(value: number, samples: number[]): number {
  if (samples.length === 0) return 0;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  if (max <= min) return value >= max ? 100 : 0;
  return Math.round(Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)));
}

export function buildSkillRadarAxes(
  member: CommunityMemberStats,
  cohort: CommunityMemberStats[],
): SkillRadarAxes {
  const tasks = cohort.map((c) => c.tasksDone);
  const rigorVals = cohort.map((c) =>
    c.tasksDone > 0 ? c.challengeXp / c.tasksDone : 0,
  );
  const breadth = cohort.map((c) => c.topicBreadth);
  const driveVals = cohort.map(
    (c) => Math.min(100, Math.sqrt(c.streakDays + 1) * 12 + c.achCount * 14),
  );
  const masteryVals = cohort.map(
    (c) => c.roadmapsDone * 22 + c.achCount * 12 + c.xpTotal / 80,
  );

  const mRigor = member.tasksDone > 0 ? member.challengeXp / member.tasksDone : 0;
  const mDrive = Math.min(
    100,
    Math.sqrt(member.streakDays + 1) * 12 + member.achCount * 14,
  );
  const mMastery =
    member.roadmapsDone * 22 + member.achCount * 12 + member.xpTotal / 80;

  return {
    volume: linNorm(member.tasksDone, tasks),
    rigor: linNorm(mRigor, rigorVals),
    breadth: linNorm(member.topicBreadth, breadth),
    drive: linNorm(mDrive, driveVals),
    mastery: linNorm(mMastery, masteryVals),
  };
}

/** SVG radar point angles in degrees (5 axes, start top, clockwise). Reference: pentagon vertices. */
export const RADAR_AXIS_ANGLES_DEG = [-90, -18, 54, 126, 198] as const;

export function radarPoints(values: SkillRadarAxes, radius: number): string {
  const order: (keyof SkillRadarAxes)[] = [
    "volume",
    "rigor",
    "breadth",
    "drive",
    "mastery",
  ];
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (RADAR_AXIS_ANGLES_DEG[i] * Math.PI) / 180;
    const v = values[order[i]] / 100;
    const r = Math.max(0.04, v) * radius;
    const x = radius + r * Math.cos(angle);
    const y = radius + r * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(" ");
}

export function ringPolygon(radius: number, frac: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (RADAR_AXIS_ANGLES_DEG[i] * Math.PI) / 180;
    const r = radius * frac;
    const x = radius + r * Math.cos(angle);
    const y = radius + r * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(" ");
}
