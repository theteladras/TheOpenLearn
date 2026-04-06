import { PrismaClient } from "@prisma/client";
import { ensureAllPredefinedMilestones } from "../lib/ensure-milestone-achievements";

const prisma = new PrismaClient();

async function main() {
  const core: {
    slug: string;
    title: string;
    description: string;
    xpBonus: number;
    icon: string | null;
  }[] = [
    {
      slug: "first_step",
      title: "First Step",
      description: "Complete your first task.",
      xpBonus: 50,
      icon: null,
    },
    {
      slug: "phase_crusher",
      title: "Phase Crusher",
      description: "Finish every task in a phase.",
      xpBonus: 100,
      icon: null,
    },
    {
      slug: "consistent_learner",
      title: "Consistent Learner",
      description: "Stay active across multiple sessions.",
      xpBonus: 75,
      icon: null,
    },
    {
      slug: "roadmap_finisher",
      title: "Roadmap Finisher",
      description: "Complete an entire roadmap.",
      xpBonus: 500,
      icon: null,
    },
    {
      slug: "achievement_fan",
      title: "Badge enthusiast",
      description: "Earn five or more achievements overall.",
      xpBonus: 125,
      icon: null,
    },
    {
      slug: "topic_explorer",
      title: "Topic explorer",
      description: "Complete a lesson in three different topic areas.",
      xpBonus: 150,
      icon: null,
    },
  ];

  for (const row of core) {
    await prisma.achievement.upsert({
      where: { slug: row.slug },
      create: row,
      update: {
        title: row.title,
        description: row.description,
        xpBonus: row.xpBonus,
        icon: row.icon,
      },
    });
  }

  await ensureAllPredefinedMilestones();

  console.log("Seeded achievements.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
