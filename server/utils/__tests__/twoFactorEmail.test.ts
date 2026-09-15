import { describe, expect, it } from "vitest";
import {
  isBrevoUnauthorisedIpFailure,
  maskEmail,
  twoFactorSendFailureMessage,
} from "../twoFactorEmail";

describe("isBrevoUnauthorisedIpFailure", () => {
  it("detecta el rechazo de IP de Brevo", () => {
    expect(
      isBrevoUnauthorisedIpFailure({
        code: "unauthorized",
        message:
          "We have detected you are using an unrecognised IP address 1.2.3.4. If you performed this action make sure to add the new IP address in this link: https://app.brevo.com/security/authorised_ips",
      }),
    ).toBe(true);
  });

  it("no marca otros errores de envío", () => {
    expect(
      isBrevoUnauthorisedIpFailure({
        code: "invalid_parameter",
        message: "Invalid sender",
      }),
    ).toBe(false);
  });
});

describe("twoFactorSendFailureMessage", () => {
  it("indica cómo desbloquear Brevo si la IP está restringida", () => {
    const message = twoFactorSendFailureMessage("pi******@gmail.com", {
      code: "unauthorized",
      message: "unrecognised IP address 8.8.8.8 authorised_ips",
    });
    expect(message).toContain("Brevo bloqueó la IP del servidor");
    expect(message).toContain("authorised_ips");
  });

  it("conserva el mensaje genérico para otros fallos", () => {
    expect(twoFactorSendFailureMessage("pi******@gmail.com")).toContain(
      "Verifica que el correo sea correcto",
    );
  });
});

describe("maskEmail", () => {
  it("oculta el local-part dejando dos caracteres", () => {
    expect(maskEmail("piloto@gmail.com")).toBe("pi****@gmail.com");
  });
});
