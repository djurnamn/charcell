import type { ComponentScenarios } from "./types";

// A message of its own for each context, so every scenario is written: the
// road for the warning, and the safe in corley's office for the rest.
const props = { context: "warning", title: "roadblocks ahead" };

export default {
  props,
  children: "police are turning everyone around on highway 9.",
  columns: 40,
  scenarios: [
    {
      id: "context-warning",
      label: "context: warning",
      description: "a warning, its kind named in words before the message.",
      default: true,
    },
    {
      id: "context-information",
      label: "context: information",
      props: { context: "information", title: "the safe takes six digits" },
      children: "the combination is back at the vultures' hideout.",
    },
    {
      id: "context-success",
      label: "context: success",
      props: { context: "success", title: "the safe is open" },
      children: "154492 was the combination.",
    },
    {
      id: "context-error",
      label: "context: error",
      props: { context: "error", title: "wrong combination" },
      children: "the safe stays shut.",
    },
  ],
} satisfies ComponentScenarios;
