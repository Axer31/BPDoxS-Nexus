import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding...');

  // 1. Seed Indian States (Official GST Codes)
  const states = [
    { code: 1, name: "Jammu & Kashmir" },
    { code: 2, name: "Himachal Pradesh" },
    { code: 3, name: "Punjab" },
    { code: 4, name: "Chandigarh" },
    { code: 5, name: "Uttarakhand" },
    { code: 6, name: "Haryana" },
    { code: 7, name: "Delhi" },
    { code: 8, name: "Rajasthan" },
    { code: 9, name: "Uttar Pradesh" },
    { code: 10, name: "Bihar" },
    { code: 11, name: "Sikkim" },
    { code: 12, name: "Arunachal Pradesh" },
    { code: 13, name: "Nagaland" },
    { code: 14, name: "Manipur" },
    { code: 15, name: "Mizoram" },
    { code: 16, name: "Tripura" },
    { code: 17, name: "Meghalaya" },
    { code: 18, name: "Assam" },
    { code: 19, name: "West Bengal" },
    { code: 20, name: "Jharkhand" },
    { code: 21, name: "Odisha" },
    { code: 22, name: "Chhattisgarh" },
    { code: 23, name: "Madhya Pradesh" },
    { code: 24, name: "Gujarat" },
    { code: 25, name: "Daman & Diu" },
    { code: 26, name: "Dadra & Nagar Haveli" },
    { code: 27, name: "Maharashtra" },
    { code: 29, name: "Karnataka" },
    { code: 30, name: "Goa" },
    { code: 31, name: "Lakshadweep" },
    { code: 32, name: "Kerala" },
    { code: 33, name: "Tamil Nadu" },
    { code: 34, name: "Puducherry" },
    { code: 35, name: "Andaman & Nicobar Islands" },
    { code: 36, name: "Telangana" },
    { code: 37, name: "Andhra Pradesh" },
    { code: 38, name: "Ladakh" },
    { code: 97, name: "Other Territory" },
    { code: 99, name: "International / Export" } // Special code for foreign clients
  ];

  console.log(`... Seeding ${states.length} States`);
  for (const s of states) {
    await prisma.state.upsert({
      where: { code: s.code },
      update: {},
      create: s
    });
  }

  // 2. Seed Countries (Simplified List)
  const countries = [
    { iso_code: "IN", name: "India", currency: "INR", phone_code: "91" },
    { iso_code: "US", name: "United States", currency: "USD", phone_code: "1" },
    { iso_code: "CA", name: "Canada", currency: "CAD", phone_code: "1" },
    { iso_code: "GB", name: "United Kingdom", currency: "GBP", phone_code: "44" },
    { iso_code: "AU", name: "Australia", currency: "AUD", phone_code: "61" },
    { iso_code: "AE", name: "United Arab Emirates", currency: "AED", phone_code: "971" },
    { iso_code: "SG", name: "Singapore", currency: "SGD", phone_code: "65" },
    { iso_code: "DE", name: "Germany", currency: "EUR", phone_code: "49" },
    { iso_code: "FR", name: "France", currency: "EUR", phone_code: "33" },
    { iso_code: "JP", name: "Japan", currency: "JPY", phone_code: "81" }
  ];

  console.log(`... Seeding ${countries.length} Major Countries`);
  for (const c of countries) {
    await prisma.country.upsert({
      where: { iso_code: c.iso_code },
      update: {},
      create: c
    });
  }

  console.log('✅ Seeding Complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });