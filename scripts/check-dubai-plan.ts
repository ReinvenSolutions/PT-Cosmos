import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkDubaiPlan() {
  const dubaiPlan = await db
    .select()
    .from(destinations)
    .where(eq(destinations.name, "Dubai y Los Emiratos"));

  console.log("\n🔍 DETALLES DEL PLAN 'Dubai y Los Emiratos':\n");
  
  if (dubaiPlan.length === 0) {
    console.log("❌ Plan no encontrado en la base de datos");
  } else {
    console.log("✅ Plan encontrado:");
    console.log(JSON.stringify(dubaiPlan[0], null, 2));
  }

  // También buscar variaciones del nombre
  console.log("\n🔍 Buscando variaciones del nombre...\n");
  
  const allDubai = await db
    .select()
    .from(destinations);
    
  const dubaiPlans = allDubai.filter(d => 
    d.name.toLowerCase().includes('dubai') || 
    d.name.toLowerCase().includes('emiratos')
  );
  
  console.log(`\n📋 Planes con 'Dubai' o 'Emiratos' (${dubaiPlans.length}):\n`);
  dubaiPlans.forEach((d, i) => {
    const status = d.isActive ? '✅' : '❌';
    console.log(`${i + 1}. ${status} "${d.name}" - Active: ${d.isActive}, Category: ${d.category}, Order: ${d.displayOrder}`);
  });

  process.exit(0);
}

checkDubaiPlan();
