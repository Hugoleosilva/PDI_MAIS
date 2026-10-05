import { describe, expect, it } from "vitest";
import { syncPayloadSchema } from "./schema";

function payloadWithCertificateUrl(certificateUrl: string) {
  return {
    root: { title: "PDI 2026" },
    areas: [
      {
        title: "Área",
        actions: [{ title: "Ação", certificateUrl }],
      },
    ],
  };
}

describe("certificateUrl", () => {
  it("aceita link http(s)", () => {
    const parsed = syncPayloadSchema.safeParse(
      payloadWithCertificateUrl("https://exemplo.com/certificado.pdf"),
    );
    expect(parsed.success).toBe(true);
  });

  it("rejeita esquema javascript: (evita link clicável malicioso salvo no PDI)", () => {
    const parsed = syncPayloadSchema.safeParse(
      payloadWithCertificateUrl("javascript:alert(document.cookie)"),
    );
    expect(parsed.success).toBe(false);
  });

  it("rejeita esquema data:", () => {
    const parsed = syncPayloadSchema.safeParse(
      payloadWithCertificateUrl("data:text/html,<script>alert(1)</script>"),
    );
    expect(parsed.success).toBe(false);
  });
});
