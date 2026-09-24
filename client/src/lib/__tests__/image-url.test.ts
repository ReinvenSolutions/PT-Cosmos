import { describe, expect, it } from "vitest";
import { displayImageUrl } from "../image-url";

const ORIGINAL =
  "https://example.supabase.co/storage/v1/object/public/plan-turquia/cover.jpg";

describe("displayImageUrl", () => {
  it("pide una versión de tarjeta en Supabase", () => {
    expect(displayImageUrl(ORIGINAL, "card")).toBe(
      "https://example.supabase.co/storage/v1/render/image/public/plan-turquia/cover.jpg?width=800&quality=75&resize=cover",
    );
  });

  it("deja el original para el visor y para URLs que no son de Storage", () => {
    expect(displayImageUrl(ORIGINAL, "full")).toBe(ORIGINAL);
    expect(displayImageUrl("/images/logo.png", "card")).toBe("/images/logo.png");
  });
});
