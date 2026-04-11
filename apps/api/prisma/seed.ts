import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Roles
  const roles = ['owner', 'admin', 'member', 'viewer'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name.charAt(0).toUpperCase() + name.slice(1)} role` },
    });
  }

  // Boards
  const boards = [
    { name: 'Tharsis', description: 'The original Terraforming Mars board' },
    { name: 'Hellas', description: 'Southern hemisphere board with unique milestones and awards' },
    { name: 'Elysium', description: 'Eastern hemisphere board' },
    { name: 'Utopia Planitia', description: 'Fan-created board' },
  ];
  for (const board of boards) {
    await prisma.board.upsert({ where: { name: board.name }, update: {}, create: board });
  }

  // Expansion sets
  const expansions = [
    { name: 'Prelude', description: 'Adds prelude cards to speed up early game' },
    { name: 'Turmoil', description: 'Adds global events and political parties' },
    { name: 'Colonies', description: 'Adds colony tiles for resource production' },
    { name: 'Venus Next', description: 'Adds Venus terraforming track' },
    { name: 'Prelude 2', description: 'Second set of prelude cards' },
    { name: 'The Dice Game', description: 'Dice-based variant' },
    { name: 'Ares Expedition', description: 'Card game spinoff' },
  ];
  for (const exp of expansions) {
    await prisma.expansionSet.upsert({ where: { name: exp.name }, update: {}, create: exp });
  }

  // Base corporations (no expansion)
  const baseCorps = [
    'Beginner Corporation',
    'CrediCor',
    'EcoLine',
    'Helion',
    'Interplanetary Cinematics',
    'Inventrix',
    'Mining Guild',
    'Phobolog',
    'Saturn Systems',
    'Teractor',
    'ThorGate',
    'United Nations Mars Initiative',
  ];
  for (const name of baseCorps) {
    await prisma.corporation.upsert({
      where: { name },
      update: {},
      create: { name, expansionSetId: null },
    });
  }

  // Prelude corporations
  const prelude = await prisma.expansionSet.findUnique({ where: { name: 'Prelude' } });
  if (prelude) {
    const preludeCorps = ['Cheung Shing MARS', 'Point Luna', 'Robinson Industries', 'Valley Trust', 'Vitor'];
    for (const name of preludeCorps) {
      await prisma.corporation.upsert({
        where: { name },
        update: {},
        create: { name, expansionSetId: prelude.id },
      });
    }
  }

  // Venus Next corporations
  const venus = await prisma.expansionSet.findUnique({ where: { name: 'Venus Next' } });
  if (venus) {
    const venusCorps = ['Aphrodite', 'Celestic', 'Viron', 'Manutech', 'Morgans'];
    for (const name of venusCorps) {
      await prisma.corporation.upsert({
        where: { name },
        update: {},
        create: { name, expansionSetId: venus.id },
      });
    }
  }

  // Turmoil corporations
  const turmoil = await prisma.expansionSet.findUnique({ where: { name: 'Turmoil' } });
  if (turmoil) {
    const turmoilCorps = ['Lakefront Resorts', 'Pristar', 'Recyclon', 'Splice', 'Mons Insurance'];
    for (const name of turmoilCorps) {
      await prisma.corporation.upsert({
        where: { name },
        update: {},
        create: { name, expansionSetId: turmoil.id },
      });
    }
  }

  // Colonies corporations
  const colonies = await prisma.expansionSet.findUnique({ where: { name: 'Colonies' } });
  if (colonies) {
    const coloniesCorps = ['Aridor', 'Arklight', 'Polyphemos', 'Poseidon', 'Storm Craft Industries'];
    for (const name of coloniesCorps) {
      await prisma.corporation.upsert({
        where: { name },
        update: {},
        create: { name, expansionSetId: colonies.id },
      });
    }
  }

  const corpCount = await prisma.corporation.count();
  const roleCount = await prisma.role.count();
  console.log(`Seed complete: ${roleCount} roles, ${boards.length} boards, ${expansions.length} expansions, ${corpCount} corporations`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
