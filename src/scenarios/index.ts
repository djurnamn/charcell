// Every component's scenarios, by name: the configurations the docs site
// shows and the cell check holds to their text versions.
import accordion from "./accordion";
import button from "./button";
import checkbox from "./checkbox";
import combobox from "./combobox";
import field from "./field";
import frame from "./frame";
import actionMenu from "./action-menu";
import dialog from "./dialog";
import inlineMessage from "./inline-message";
import popover from "./popover";
import progress from "./progress";
import radioGroup from "./radio-group";
import richText from "./rich-text";
import scrollArea from "./scroll-area";
import select from "./select";
import separator from "./separator";
import sortableGroup from "./sortable-group";
import sortableList from "./sortable-list";
import splitGrid from "./split-grid";
import splitter from "./splitter";
import table from "./table";
import tabs from "./tabs";
import textarea from "./textarea";
import codeBlock from "./code-block";
import textInput from "./text-input";
import toggle from "./toggle";
import tooltip from "./tooltip";
import tree from "./tree";
import type { ComponentScenarios } from "./types";

export type { ComponentScenarios, Content, Scenario, Value } from "./types";
export { withGenerated } from "./generate";

export const SCENARIOS: Record<string, ComponentScenarios> = {
  Accordion: accordion,
  Button: button,
  Checkbox: checkbox,
  Combobox: combobox,
  Field: field,
  Frame: frame,
  ActionMenu: actionMenu,
  Dialog: dialog,
  InlineMessage: inlineMessage,
  Popover: popover,
  Progress: progress,
  RadioGroup: radioGroup,
  RichText: richText,
  ScrollArea: scrollArea,
  Select: select,
  Separator: separator,
  SortableGroup: sortableGroup,
  SortableList: sortableList,
  SplitGrid: splitGrid,
  Splitter: splitter,
  Table: table,
  Tabs: tabs,
  Textarea: textarea,
  CodeBlock: codeBlock,
  TextInput: textInput,
  Toggle: toggle,
  Tooltip: tooltip,
  Tree: tree,
};
