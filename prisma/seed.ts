import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@letmeflex.ai";
  const adminPasswordHash = await bcrypt.hash("admin123456", 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      credits: 9999,
      plan: "UNLIMITED",
    },
  });

  console.log(`Admin user created: ${admin.email} (${admin.id})`);

  // Create default model config for fal-ai/flux/dev
  const defaultModel = await prisma.modelConfig.upsert({
    where: { id: "default-fal-flux" },
    update: {},
    create: {
      id: "default-fal-flux",
      name: "Flux Dev (fal.ai)",
      provider: "fal",
      modelId: "fal-ai/flux/dev",
      isActive: true,
      isDefault: true,
      costPerGen: 0.025,
      avgSeconds: 15,
      notes: "Default model. Good balance of quality and speed.",
    },
  });

  console.log(`Default model config created: ${defaultModel.name}`);

  // Create additional model configs
  await prisma.modelConfig.upsert({
    where: { id: "fal-flux-pro" },
    update: {},
    create: {
      id: "fal-flux-pro",
      name: "Flux Pro (fal.ai)",
      provider: "fal",
      modelId: "fal-ai/flux-pro",
      isActive: false,
      isDefault: false,
      costPerGen: 0.05,
      avgSeconds: 20,
      notes: "Higher quality, slower generation.",
    },
  });

  await prisma.modelConfig.upsert({
    where: { id: "replicate-flux-pro" },
    update: {},
    create: {
      id: "replicate-flux-pro",
      name: "Flux 1.1 Pro (Replicate)",
      provider: "replicate",
      modelId: "black-forest-labs/flux-1.1-pro",
      isActive: false,
      isDefault: false,
      costPerGen: 0.04,
      avgSeconds: 25,
      notes: "Alternative provider for Flux Pro.",
    },
  });

  console.log("Additional model configs created.");

  // Create site config entries
  const siteConfigs = [
    { key: "maintenance_mode", value: "false" },
    { key: "referral_enabled", value: "true" },
    { key: "face_swap_enabled", value: "true" },
    { key: "free_credits_on_signup", value: "3" },
    { key: "referral_bonus_referrer", value: "5" },
    { key: "referral_bonus_referred", value: "2" },
  ];

  for (const config of siteConfigs) {
    await prisma.siteConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }

  console.log("Site config entries created.");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
