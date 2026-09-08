import type { SyncPayloadInput } from "../schema";

/**
 * Seed com o PDI real do Hugo (ciclo 2026), transcrito dos prints da plataforma.
 * Usado pela rota de dev `GET /api/dev/seed` para testar o canvas sem a extensão.
 * Não é a fonte de verdade — o usuário vai inserir/ajustar manualmente depois.
 */
export const seedHugo: SyncPayloadInput = {
  root: { title: "PDI 2026", track: "Desenvolvimento Fullstack" },
  areas: [
    {
      title: "Inovação Aplicada e Soluções Corporativas (TideFlow / Protrack)",
      kind: "Desenvolver",
      description:
        "Área focada no desenvolvimento, arquitetura e implantação do ecossistema TideFlow/Protrack — PWA de alta performance para eliminar processos manuais e centralizar a gestão de projetos da empresa.",
      actions: [
        {
          title: "Escala, Arquitetura de Agentes (MCP) e SaaS (V3)",
          kind: "Desafio profissional",
          status: "Não iniciado",
          dueDate: "2026-12-31",
        },
        {
          title: "Arquitetura, Engenharia de Requisitos e Entrega do MVP da V1",
          kind: "Desafio profissional",
          status: "Finalizado",
          dueDate: "2026-09-04",
        },
        {
          title:
            "Engenharia de Software Avançada, Evolução Técnica e Implementação da V2",
          kind: "Desafio profissional",
          status: "Não iniciado",
          dueDate: "2026-12-31",
        },
      ],
    },
    {
      title: "Desenvolvimento Low-Code / Full-Stack",
      kind: "Desenvolver",
      actions: [
        {
          title: "Domínio da Plataforma OutSystems",
          kind: "Treinamento e estudo",
          status: "Não iniciado",
          dueDate: "2026-12-31",
        },
        {
          title: "Domínio da Plataforma Mendix",
          kind: "Treinamento e estudo",
          status: "Não iniciado",
          dueDate: "2026-12-31",
        },
      ],
    },
    {
      title: "Competências Comportamentais e Colaboração Organizacional",
      kind: "Desenvolver",
      actions: [
        {
          title: "Formações obrigatórias de Segurança da Informação – 2026",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-08-18",
        },
        {
          title:
            "[Hey IA Hour #19 - Com Túlio de Pádua] Você sabe para quem está falando? Da teoria da comunicação à engenharia de prompt: o poder do contexto",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-06-12",
        },
        {
          title:
            "[Meetup Técnico] Notebooks Python eficientes com IA usando Marimo - Um guia prático para construir fluxos de trabalho com LLMs",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-06-11",
        },
        {
          title: "Reunião da Vertical: Spec Driven Development",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-04-07",
        },
        {
          title: "Reunião da Vertical Frontend: Agentes de Codificação",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-03-24",
        },
        {
          title: "Reunião da Vertical: Prompt Engineering",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-03-10",
        },
        {
          title:
            "Télos: Softskills - Competências Comportamentais e Relacionamento Interpessoal",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-05-27",
        },
      ],
    },
    {
      title: "Inglês Técnico e Comunicação Profissional",
      kind: "Desenvolver",
      actions: [
        {
          title: "Télos: Curso Inglês",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-05-15",
        },
        {
          title: "Hashtag: Curso de Inglês.",
          kind: "Treinamento e estudo",
          status: "Em progresso",
          dueDate: "2026-12-01",
        },
      ],
    },
    {
      title: "Engenharia e Análise de Dados",
      kind: "Desenvolver",
      actions: [
        {
          title: "Uninassau: MBA em Data Science, Analytics e BI.",
          kind: "Treinamento e estudo",
          status: "Em progresso",
          dueDate: "2026-10-03",
        },
        {
          title: "Udemy: Curso Aprendendo Sql do zero.",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-01-12",
        },
        {
          title: "Télos: Introdução ao Python para análise de dados.",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-03-16",
        },
      ],
    },
    {
      title: "Tecnologias de Backend",
      kind: "Desenvolver",
      actions: [
        {
          title: "Uninassau: Graduação em Análise e Desenvolvimento de Sistemas",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-07-01",
        },
        {
          title: "Udemy: Node.js do Zero a Maestria com diversos Projetos.",
          kind: "Treinamento e estudo",
          status: "Em progresso",
          dueDate: "2026-10-03",
        },
        {
          title: "Télos: NodeJS + MongoDB",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-05-15",
        },
        {
          title:
            "Udemy: Node.js do Zero a Maestria com diversos Projetos (Express)",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-04-20",
        },
        {
          title: "Télos - Node.JS Básico",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-04-27",
        },
      ],
    },
    {
      title: "Tecnologias de Frontend",
      kind: "Desenvolver",
      actions: [
        {
          title: "Udemy: Next.js do Zero ao Avançado com Projetos",
          kind: "Treinamento e estudo",
          status: "Em progresso",
          dueDate: "2026-10-30",
        },
        {
          title:
            "Udemy: Formação Frontend - HTML e CSS; JavaScript; React; E uma imersão em TypeScript com foco em React.",
          kind: "Treinamento e estudo",
          status: "Em progresso",
          dueDate: "2026-10-15",
        },
        {
          title:
            "Télos: HTML, Semântica e Sintaxe. Introdução ao CSS. SEO. Grid e Flexbox.",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2025-12-21",
        },
        {
          title: "Télos: O que é JavaScript (Client x Server).",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2025-11-30",
        },
      ],
    },
    {
      title: "Inteligência Artificial / Automação",
      kind: "Desenvolver",
      actions: [
        {
          title: "Udemy - MCP na Prática: Crie Agentes e Multi-Agentes com LLMs",
          kind: "Treinamento e estudo",
          status: "Não iniciado",
          dueDate: "2026-09-14",
        },
        {
          title: "Udemy - Formação n8n: Workflows, APIs e IA na Prática",
          kind: "Treinamento e estudo",
          status: "Não iniciado",
          dueDate: "2026-09-09",
        },
        {
          title: "Masterclass Claude Code para Devs - Cod3r Cursos",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-06-27",
        },
        {
          title: "AI Driven Development - Formação DEV Cod3r - Leonardo Leitão",
          kind: "Treinamento e estudo",
          status: "Em progresso",
          dueDate: "2026-10-03",
        },
        {
          title:
            "Udemy - NotebookLM : Produtividade e Aprendizado com IA Generativa.",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-06-29",
        },
        {
          title: "Iniciar trilha de aprendizagem em IA (Alura)",
          kind: "Treinamento e estudo",
          status: "Finalizado",
          dueDate: "2026-04-28",
        },
      ],
    },
  ],
};
