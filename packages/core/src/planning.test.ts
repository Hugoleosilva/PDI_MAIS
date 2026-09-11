import { describe, expect, it } from "vitest";
import {
  actionCompletion,
  areaRealProgress,
  burndownSeries,
  EMPTY_CAPACITY,
  planForDoc,
  projectFromActions,
  weeklyHours,
} from "./planning";
import type { Action, Area, PdiDoc } from "./types";

const act = (p: Partial<Action>): Action => ({
  id: p.id ?? "a",
  title: p.title ?? "Ação",
  kind: "treinamento_estudo",
  status: p.status ?? "todo",
  source: "manual",
  ...p,
});

describe("actionCompletion", () => {
  it("done = 100% sempre", () => {
    expect(actionCompletion(act({ status: "done", unitsTotal: 290, unitsDone: 23 }))).toBe(1);
  });
  it("módulos: 23/290 ≈ 0.079", () => {
    expect(actionCompletion(act({ status: "doing", unitsTotal: 290, unitsDone: 23 }))).toBeCloseTo(23 / 290);
  });
  it("horas feitas quando não tem módulos", () => {
    expect(actionCompletion(act({ status: "doing", estimatedHours: 40, hoursDone: 10 }))).toBe(0.25);
  });
  it("fallback pro status", () => {
    expect(actionCompletion(act({ status: "doing" }))).toBe(0.5);
    expect(actionCompletion(act({ status: "todo" }))).toBe(0);
  });
});

describe("weeklyHours", () => {
  it("soma a grade", () => {
    expect(weeklyHours({ ...EMPTY_CAPACITY, mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 2 })).toBe(7);
  });
});

describe("projectFromActions", () => {
  it("projeta a data pelo restante ÷ horas semanais", () => {
    const actions = [
      act({ estimatedHours: 40, status: "doing", hoursDone: 10 }), // restam 30
      act({ estimatedHours: 20, status: "todo" }), // restam 20
    ];
    const cap = { ...EMPTY_CAPACITY, mon: 1, tue: 1, wed: 1, thu: 1, fri: 1 }; // 5h/sem
    const p = projectFromActions(actions, cap, new Date("2026-01-01"));
    expect(p.remainingHours).toBe(50);
    expect(p.weeksLeft).toBe(10);
    expect(p.projectedDate).toBe("2026-03-12"); // +70 dias
    // completion = média simples por ação, não ponderada por horas:
    // ação 1 = 10/40 = 0.25; ação 2 = 0 → média 0.125
    expect(p.completion).toBeCloseTo(0.125);
  });
  it("sem capacidade → sem data projetada", () => {
    const p = projectFromActions([act({ estimatedHours: 10 })], undefined, new Date());
    expect(p.projectedDate).toBeNull();
  });
});

describe("planForDoc", () => {
  const area = (id: string, actions: Action[]): Area => ({
    id,
    title: id,
    kind: "desenvolver",
    status: "doing",
    order: 0,
    actions,
  });
  const pdi: PdiDoc = {
    userId: "u",
    shareId: null,
    updatedAt: new Date(),
    syncedAt: null,
    root: { title: "PDI" },
    areas: [
      area("a1", [act({ id: "x1", estimatedHours: 20, status: "todo", dueDate: "2026-02-01" })]),
      area("a2", [act({ id: "x2", estimatedHours: 10, status: "done" })]),
    ],
    groups: [
      {
        id: "g1",
        title: "Bloco",
        color: "#2563EB",
        order: 0,
        areaIds: ["a1"],
        capacity: { ...EMPTY_CAPACITY, mon: 5 },
      },
    ],
  };

  it("bloco projeta; área fora de bloco cai no 'Fora de bloco'", () => {
    const { blocks } = planForDoc(pdi, new Date("2026-01-01"));
    expect(blocks).toHaveLength(2);
    const b = blocks.find((x) => x.groupId === "g1")!;
    expect(b.projection.remainingHours).toBe(20);
    expect(b.projection.weeksLeft).toBe(4);
    // projeta 29/01 (4 sem) vs meta 01/02 → dentro de ±1 semana
    expect(b.status).toBe("no-ritmo");
    expect(b.projection.projectedDate).toBe("2026-01-29");
    const loose = blocks.find((x) => x.groupId === null)!;
    expect(loose.areaIds).toEqual(["a2"]);
  });

  it("paused reflete PdiGroup.paused; 'Fora de bloco' nunca pausa", () => {
    const paused: PdiDoc = { ...pdi, groups: [{ ...pdi.groups![0], paused: true }] };
    const { blocks } = planForDoc(paused, new Date("2026-01-01"));
    expect(blocks.find((x) => x.groupId === "g1")!.paused).toBe(true);
    expect(blocks.find((x) => x.groupId === null)!.paused).toBe(false);
  });
});

describe("burndownSeries", () => {
  it("previsto vai a zero no ritmo; real desce nos completedAt", () => {
    const actions = [
      act({ id: "1", estimatedHours: 10, status: "done", completedAt: "2026-01-08" }),
      act({ id: "2", estimatedHours: 10, status: "doing", hoursDone: 5 }),
      act({ id: "3", estimatedHours: 10, status: "todo" }),
    ];
    const s = burndownSeries(actions, 10, "2026-01-01", "2026-01-15");
    expect(s.total).toBe(30);
    expect(s.planned.at(-1)).toEqual({ t: 21, h: 0 }); // 30h ÷ 10h/sem = 3 sem
    // real: começa 30, cai pra 20 no dia 7, e hoje (dia 14) está em 30-15 = 15
    expect(s.actual[0]).toEqual({ t: 0, h: 30 });
    expect(s.actual.at(-1)).toEqual({ t: 14, h: 15 });
  });
});

describe("areaRealProgress", () => {
  it("média simples por ação — NUNCA pondera por horas", () => {
    // uma ação de 90h parada e outra de 10h finalizada: é 50%, não 10%.
    // (uma formação grande em horas não pode "abafar" o progresso das outras.)
    const a: Area = {
      id: "a",
      title: "a",
      kind: "desenvolver",
      status: "doing",
      order: 0,
      actions: [
        act({ estimatedHours: 90, status: "todo" }), // 0
        act({ estimatedHours: 10, status: "done" }), // 1
      ],
    };
    expect(areaRealProgress(a)).toBe(0.5);
  });

  it("mistura módulos e horas em pé de igualdade", () => {
    const a: Area = {
      id: "a",
      title: "a",
      kind: "desenvolver",
      status: "doing",
      order: 0,
      actions: [
        act({ status: "doing", unitsTotal: 100, unitsDone: 50 }), // 0.5 (módulos)
        act({ status: "doing", estimatedHours: 40, hoursDone: 20 }), // 0.5 (horas)
      ],
    };
    expect(areaRealProgress(a)).toBe(0.5);
  });
});
