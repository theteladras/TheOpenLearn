import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = [
    {
      slug: "first_step",
      title: "First Step",
      description: "Complete your first task.",
      xpBonus: 50,
      icon: "🎯",
    },
    {
      slug: "phase_crusher",
      title: "Phase Crusher",
      description: "Finish every task in a phase.",
      xpBonus: 100,
      icon: "⚡",
    },
    {
      slug: "consistent_learner",
      title: "Consistent Learner",
      description: "Stay active across multiple sessions.",
      xpBonus: 75,
      icon: "🔥",
    },
    {
      slug: "roadmap_finisher",
      title: "Roadmap Finisher",
      description: "Complete an entire roadmap.",
      xpBonus: 500,
      icon: "🏆",
    },
  ];

  for (const row of rows) {
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

  console.log("Seeded achievements.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
