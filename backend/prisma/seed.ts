import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Admin user
  await prisma.user.upsert({
    where: { email: 'admin@qurankids.com' },
    update: {},
    create: {
      email: 'admin@qurankids.com',
      passwordHash: await bcrypt.hash('admin123456', 12),
      role: 'admin',
    },
  })

  // Badges
  const badges = [
    { name: 'Pembaca Perdana', description: 'Selesaikan kisah pertamamu', requirementType: 'stories_completed' as const, requirementValue: 1 },
    { name: 'Api Semangat', description: 'Streak 7 hari berturut-turut', requirementType: 'streak_days' as const, requirementValue: 7 },
    { name: 'Pencari Ilmu', description: 'Kumpulkan 500 poin', requirementType: 'points' as const, requirementValue: 500 },
    { name: 'Khatam Perdana', description: 'Selesaikan 10 kisah', requirementType: 'stories_completed' as const, requirementValue: 10 },
  ]

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge,
    })
  }

  // Sample story
  await prisma.story.upsert({
    where: { slug: 'kisah-abu-bakar-ash-shiddiq' },
    update: {},
    create: {
      title: 'Kisah Abu Bakar Ash-Shiddiq',
      slug: 'kisah-abu-bakar-ash-shiddiq',
      category: 'sahabat_nabi',
      difficultyLevel: 'easy',
      isPremium: false,
      isPublished: true,
      totalPages: 2,
      pages: {
        create: [
          {
            pageNumber: 1,
            textArabic: 'أبو بكر الصديق رضي الله عنه',
            textLatin: 'Abu Bakr Ash-Shiddiq radhiyallahu anhu',
            textTranslation: 'Abu Bakar Ash-Shiddiq adalah sahabat terdekat Rasulullah SAW dan orang pertama yang masuk Islam dari kalangan orang dewasa.',
          },
          {
            pageNumber: 2,
            textTranslation: 'Beliau dikenal sebagai Ash-Shiddiq, yang artinya "Yang Membenarkan", karena beliau selalu membenarkan apa yang disampaikan Rasulullah SAW.',
          },
        ],
      },
    },
  })

  console.log('Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
