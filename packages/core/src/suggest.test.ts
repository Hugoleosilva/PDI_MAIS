import { describe, expect, it } from "vitest";
import {
  areaToIncomingInput,
  buildDiagnosisPrompt,
  parseDiagnosisResponse,
  suggestedAreaToIncomingInput,
} from "./suggest";
import { mergePdi } from "./merge";
import { incomingAreaSchema, syncPayloadSchema } from "./schema";

const payload = syncPayloadSchema.parse({
  root: { title: "PDI 2026" },
  areas: [
    {
      title: "Backend",
      description: "Servidores e APIs",
      actions: [
        { title: "Curso de Node", kind: "Treinamento e estudo", status: "Finalizado", dueDate: "2026-01-10" },
      ],
    },
  ],
});
const pdi = mergePdi(null, payload, { userId: "u1", source: "manual" });

const validRaw = JSON.stringify({
  strengths: [{ title: "Proatividade", detail: "Busca aprender sempre." }],
  improvements: [{ title: "Profundidade técnica", detail: "Aprofundar arquitetura." }],
  suggestedAreas: [
    {
      title: "Arquitetura de Software",
      description: "Aprofundar conceitos de arquitetura",
      rationale: "Fortalece o ponto a melhorar identificado",
      actions: [
        { title: "Curso de arquitetura", kind: "Treinamento e estudo", description: "Curso X" },
        { title: "Mentoria técnica", kind: "Mentoria e feedbacks" },
      ],
    },
  ],
});

describe("buildDiagnosisPrompt", () => {
  it("inclui o contexto do PDI e pede o JSON esperado", () => {
    const prompt = buildDiagnosisPrompt(pdi);
    expect(prompt).toContain("Backend");
    expect(prompt).toContain("suggestedAreas");
    expect(prompt).toContain("Treinamento e estudo");
  });
});

describe("parseDiagnosisResponse", () => {
  it("interpreta uma resposta válida", () => {
    const result = parseDiagnosisResponse(validRaw);
    expect(result.strengths).toHaveLength(1);
    expect(result.improvements).toHaveLength(1);
    expect(result.suggestedAreas).toHaveLength(1);
    expect(result.suggestedAreas[0].actions).toHaveLength(2);
  });

  it("extrai o JSON mesmo com texto/markdown ao redor", () => {
    const raw = "Aqui está:\n```json\n" + validRaw + "\n```";
    const result = parseDiagnosisResponse(raw);
    expect(result.suggestedAreas).toHaveLength(1);
  });

  it("descarta área sugerida sem ação nenhuma", () => {
    const raw = JSON.stringify({
      strengths: [],
      improvements: [],
      suggestedAreas: [{ title: "Área vazia", actions: [] }],
    });
    const result = parseDiagnosisResponse(raw);
    expect(result.suggestedAreas).toHaveLength(0);
  });

  it("joga erro claro se não for JSON válido", () => {
    expect(() => parseDiagnosisResponse("isso não é json")).toThrow();
  });

  it("aceita `detail` como apelido de `description` na área sugerida (confirmado em teste real)", () => {
    const raw = JSON.stringify({
      strengths: [],
      improvements: [],
      suggestedAreas: [
        {
          title: "Observabilidade",
          detail: "Monitorar saúde e performance das aplicações.",
          actions: [{ title: "Estudar Grafana", kind: "Treinamento e estudo" }],
        },
      ],
    });
    const result = parseDiagnosisResponse(raw);
    expect(result.suggestedAreas[0].description).toBe(
      "Monitorar saúde e performance das aplicações.",
    );
  });
});

describe("areaToIncomingInput / suggestedAreaToIncomingInput", () => {
  it("converte uma área existente de volta pro formato de entrada e bate com incomingAreaSchema", () => {
    const area = pdi.areas[0];
    const input = areaToIncomingInput(area);
    const parsed = incomingAreaSchema.parse(input);
    expect(parsed.title).toBe("Backend");
    expect(parsed.actions[0].kind).toBe("treinamento_estudo");
    expect(parsed.actions[0].status).toBe("done");
  });

  it("converte uma sugestão aceita pro mesmo formato, pronta pra juntar com as áreas existentes", () => {
    const result = parseDiagnosisResponse(validRaw);
    const input = suggestedAreaToIncomingInput(result.suggestedAreas[0]);
    const parsed = incomingAreaSchema.parse(input);
    expect(parsed.title).toBe("Arquitetura de Software");
    expect(parsed.actions).toHaveLength(2);
    expect(parsed.actions[0].kind).toBe("treinamento_estudo");
    expect(parsed.actions[1].kind).toBe("mentoria_feedback");
  });

  it("limpa campos null/string vazia de dado antigo, sem derrubar a validação", () => {
    // simula o que vinha do banco em registros antigos: null em vez de
    // ausente, "" em vez de ausente — os dois casos reais que já quebraram
    // o payload de verdade (estimatedHours: null, description: "").
    const area = {
      ...pdi.areas[0],
      description: "",
      actions: [
        {
          ...pdi.areas[0].actions[0],
          description: null as unknown as string,
          estimatedHours: null as unknown as number,
          dueDate: null as unknown as string,
        },
      ],
    };
    const input = areaToIncomingInput(area);
    const parsed = incomingAreaSchema.parse(input);
    expect(parsed.description).toBeUndefined();
    expect(parsed.actions[0].description).toBeUndefined();
    expect(parsed.actions[0].estimatedHours).toBeUndefined();
    expect(parsed.actions[0].dueDate).toBeUndefined();
  });
});
