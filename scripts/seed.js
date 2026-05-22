// scripts/seed.js

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create services
  const services = await Promise.all([
    prisma.service.upsert({
      where: { name: "Service 1" },
      update: {},
      create: { name: "Service 1" },
    }),
    prisma.service.upsert({
      where: { name: "Service 2" },
      update: {},
      create: { name: "Service 2" },
    }),
    prisma.service.upsert({
      where: { name: "Service 3" },
      update: {},
      create: { name: "Service 3" },
    }),
  ]);

  console.log("✅ Services created:", services.length);

  // Create providers
  const providers = await Promise.all([
    prisma.provider.upsert({
      where: { name: "Provider 1" },
      update: {},
      create: { name: "Provider 1", monthlyQuota: 10 },
    }),
    prisma.provider.upsert({
      where: { name: "Provider 2" },
      update: {},
      create: { name: "Provider 2", monthlyQuota: 10 },
    }),
    prisma.provider.upsert({
      where: { name: "Provider 3" },
      update: {},
      create: { name: "Provider 3", monthlyQuota: 10 },
    }),
    prisma.provider.upsert({
      where: { name: "Provider 4" },
      update: {},
      create: { name: "Provider 4", monthlyQuota: 10 },
    }),
    prisma.provider.upsert({
      where: { name: "Provider 5" },
      update: {},
      create: { name: "Provider 5", monthlyQuota: 10 },
    }),
    prisma.provider.upsert({
      where: { name: "Provider 6" },
      update: {},
      create: { name: "Provider 6", monthlyQuota: 10 },
    }),
    prisma.provider.upsert({
      where: { name: "Provider 7" },
      update: {},
      create: { name: "Provider 7", monthlyQuota: 10 },
    }),
    prisma.provider.upsert({
      where: { name: "Provider 8" },
      update: {},
      create: { name: "Provider 8", monthlyQuota: 10 },
    }),
  ]);

  console.log("✅ Providers created:", providers.length);

  // Initialize fair allocation states
  await Promise.all([
    prisma.fairAllocationState.upsert({
      where: { serviceId: 1 },
      update: {},
      create: { serviceId: 1, roundRobinState: "0" },
    }),
    prisma.fairAllocationState.upsert({
      where: { serviceId: 2 },
      update: {},
      create: { serviceId: 2, roundRobinState: "0" },
    }),
    prisma.fairAllocationState.upsert({
      where: { serviceId: 3 },
      update: {},
      create: { serviceId: 3, roundRobinState: "0" },
    }),
  ]);

  console.log("✅ Fair allocation states initialized");

  console.log("🌱 Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
