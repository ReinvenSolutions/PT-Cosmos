import { db } from '../server/db';
import { destinations } from '../shared/schema';
import { eq, or } from 'drizzle-orm';

async function checkItaliaDestinations() {
  const result = await db.select().from(destinations).where(
    or(
      eq(destinations.name, 'Italia Turística - Euro Express'),
      eq(destinations.name, 'España e Italia Turística - Euro Express')
    )
  );

  console.log('\n=== Destinos de Italia ===\n');
  console.log(`Destinos encontrados: ${result.length}`);
  
  result.forEach(d => {
    console.log(`\nNombre: ${d.name}`);
    console.log(`ID: ${d.id}`);
    console.log(`isActive: ${d.isActive}`);
    console.log(`displayOrder: ${d.displayOrder}`);
    console.log(`category: ${d.category}`);
  });
  
  process.exit(0);
}

checkItaliaDestinations().catch(console.error);
