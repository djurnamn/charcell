// type-checked by `typecheck:dist` (tsconfig.dist.json), never run: a
// consumer's view of the React target. Each component's props interface is
// public api, importable from the barrel for a wrapper to extend.
import type {
  ActionMenuProps,
  ButtonProps,
  DialogProps,
  FieldProps,
  FrameProps,
  PopoverProps,
  SelectProps,
  TooltipProps,
} from "../dist/react/index";

export const button: ButtonProps = { label: "save", variant: "dense" };
export const frame: FrameProps = { title: "pane", quiet: true, as: "div" };
export const select: SelectProps = {
  items: [{ value: "vue", label: "Vue", disabled: true }],
  id: "framework",
};
export const field: FieldProps = {
  label: "framework",
  htmlFor: "framework",
  errorMessage: "required",
};
export const popover: PopoverProps = {
  label: "settings",
  onOpenChange: (open: boolean) => void open,
};

// A trigger takes the props that open its overlay, so only the render
// function form fits: a plain node would render a button that opens nothing.
const opener = ({ triggerProps }: { triggerProps: Record<string, unknown> }) =>
  Object.keys(triggerProps).join(" ");
export const triggers: [
  DialogProps["trigger"],
  PopoverProps["trigger"],
  ActionMenuProps["trigger"],
  TooltipProps["trigger"],
] = [opener, opener, opener, opener];
// @ts-expect-error a plain node is no trigger
export const plainDialogTrigger: DialogProps["trigger"] = "open";
// @ts-expect-error a plain node is no trigger
export const plainPopoverTrigger: PopoverProps["trigger"] = "open";
// @ts-expect-error a plain node is no trigger
export const plainActionMenuTrigger: ActionMenuProps["trigger"] = "open";
// @ts-expect-error a plain node is no trigger
export const plainTooltipTrigger: TooltipProps["trigger"] = "open";
