import { db } from "../server/db";
import { destinations } from "../shared/schema";

async function checkDestinations() {
  const allDests = await db
    .select({
      id: destinations.id,
      name: destinations.name,
      country: destinations.country,
      category: destinations.category,
      isActive: destinations.isActive,
      isPromotion: destinations.isPromotion,
      displayOrder: destinations.displayOrder,
    })
    .from(destinations)
    .orderBy(destinations.displayOrder);

  console.log("\n📊 TODOS LOS DESTINOS EN LA BASE DE DATOS:\n");
  console.log("Total:", allDests.length);
  console.log("\nActivos:", allDests.filter((d) => d.isActive).length);
  console.log("Inactivos:", allDests.filter((d) => !d.isActive).length);

  console.log("\n📋 LISTA COMPLETA:\n");
  allDests.forEach((d, i) => {
    const status = d.isActive ? "✅" : "❌";
    const promo = d.isPromotion ? "🔥" : "  ";
    console.log(
      `${i + 1}. ${status} ${promo} ${d.name} (${d.country}) - ${d.category} - Order: ${d.displayOrder}`
    );
  });

  process.exit(0);
}

checkDestinations();
