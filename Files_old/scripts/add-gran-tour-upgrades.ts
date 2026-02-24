import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function addGranTourUpgrades() {
  console.log("Agregando mejoras a Gran Tour de Europa...\n");

  try {
    const upgrades = [
      { 
        code: "VI", 
        name: "Visitas incluidas", 
        price: 595 
      },
      { 
        code: "SI", 
        name: "Special Incluido", 
        description: "Visitas + Comidas", 
        price: 670 
      }
    ];
    
    console.log("Mejoras a agregar:");
    upgrades.forEach(upgrade => {
      console.log(`  ${upgrade.code}: ${upgrade.name} - $${upgrade.price} USD`);
      if (upgrade.description) {
        console.log(`    ${upgrade.description}`);
      }
    });
    
    // Actualizar Gran Tour de Europa con las mejoras
    const result = await db
      .update(destinations)
      .set({ upgrades })
      .where(eq(destinations.name, "Gran Tour de Europa"))
      .returning();
    
    if (result.length > 0) {
      console.log(`\n✅ Gran Tour de Europa actualizado con ${upgrades.length} mejoras`);
      console.log(`   VI (Visitas incluidas): $595 USD`);
      console.log(`   SI (Special Incluido): $670 USD`);
    } else {
      console.log("\n❌ No se encontró Gran Tour de Europa");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

addGranTourUpgrades();
