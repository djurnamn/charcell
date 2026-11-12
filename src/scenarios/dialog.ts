import dialog from "../components/dialog";
import { withGenerated } from "./generate";
import { windowBorder } from "./window-border";
import type { ComponentScenarios } from "./types";

// The window is what the scenarios show: it opens as each loads. It asks
// before something that cannot be undone, so it is an alertdialog, its
// focus starting on the action that keeps things as they are.
const props = {
  label: "poyahoga gorge",
  defaultOpen: true,
  role: "alertdialog",
};
const text =
  "jumping the poyahoga gorge, although tempting, is highly illegal and dangerous.";

export default {
  props,
  slots: {
    trigger: {
      scope: ["triggerProps"],
      children: {
        component: "Button",
        spread: "triggerProps",
        props: { label: "jump the gorge" },
      },
    },
    actions: {
      scope: ["closeProps"],
      children: [
        {
          component: "Button",
          spread: "closeProps",
          props: { label: "turn back", variant: "dense" },
        },
        {
          component: "Button",
          spread: "closeProps",
          props: { label: "jump the gorge", variant: "dense" },
        },
      ],
    },
  },
  children: text,
  // Generated scenarios only for what shows: the behavior flags and role change
  // nothing on screen. The window shows only open: the check reads it in
  // place, its backdrop's fixed positioning set aside.
  scenarios: withGenerated(dialog, ["border"], {
    props,
    scenarios: [
      {
        id: "raised",
        label: "raised",
        description:
          "the dialog open over the page, raised by its double right and bottom sides.",
        default: true,
      },
    ],
  }).map((scenario) => ({
    ...scenario,
    check: {
      tag: "div",
      props: { style: "width: 36ch" },
      children: {
        component: "DialogPanel",
        props: {
          label: "poyahoga gorge",
          ...windowBorder(scenario.props),
          style: "position: static; display: block; padding: 0",
        },
        slots: {
          actions: [
            {
              component: "Button",
              props: { label: "turn back", variant: "dense" },
            },
            {
              component: "Button",
              props: { label: "jump the gorge", variant: "dense" },
            },
          ],
        },
        children: text,
      },
    },
  })),
} satisfies ComponentScenarios;
