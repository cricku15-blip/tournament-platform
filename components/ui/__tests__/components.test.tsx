import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Button, IconButton } from "../button";
import { Input } from "../input";
import { Badge, Chip } from "../badge";
import { Card, CardTitle } from "../card";
import { NumberStepper } from "../number-stepper";
import { FormField } from "../form-field";
import { StatTile } from "../stat-tile";
import { LiveStrip } from "../live-strip";
import { ConfirmDialog } from "../confirm-dialog";

describe("Button component", () => {
  it("renders with default primary variant and handles click", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    const button = screen.getByRole("button", { name: "Click Me" });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disables interaction when disabled or loading", () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();

    rerender(
      <Button loading onClick={handleClick}>
        Loading
      </Button>
    );
    expect(button).toBeDisabled();
  });

  it("renders IconButton with aria-label", () => {
    render(<IconButton aria-label="Settings">⚙</IconButton>);
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });
});

describe("Input component", () => {
  it("renders and handles input change", () => {
    const handleChange = vi.fn();
    render(<Input placeholder="Enter name" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("Enter name");
    fireEvent.change(input, { target: { value: "Raipur Royals" } });
    expect(handleChange).toHaveBeenCalled();
  });

  it("renders error state with aria-invalid", () => {
    render(<Input placeholder="Error field" error />);
    const input = screen.getByPlaceholderText("Error field");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Badge and Chip components", () => {
  it("renders Live badge with pulsing indicator", () => {
    render(<Badge status="Live" />);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("renders Chip and handles onRemove", () => {
    const handleRemove = vi.fn();
    render(<Chip onRemove={handleRemove}>Cricket</Chip>);
    expect(screen.getByText("Cricket")).toBeInTheDocument();
    const removeBtn = screen.getByRole("button", { name: "Remove" });
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });
});

describe("Card component", () => {
  it("renders sport tinted edge for cricket", () => {
    const { container } = render(
      <Card sport="cricket">
        <CardTitle>Cricket League</CardTitle>
      </Card>
    );
    expect(screen.getByText("Cricket League")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("border-t-[3px]");
  });
});

describe("NumberStepper component", () => {
  it("increments and decrements within bounds", () => {
    const handleChange = vi.fn();
    render(
      <NumberStepper value={10} min={1} max={15} onChange={handleChange} />
    );
    expect(screen.getByText("10")).toBeInTheDocument();

    const increaseBtn = screen.getByRole("button", { name: "Increase" });
    fireEvent.click(increaseBtn);
    expect(handleChange).toHaveBeenCalledWith(11);

    const decreaseBtn = screen.getByRole("button", { name: "Decrease" });
    fireEvent.click(decreaseBtn);
    expect(handleChange).toHaveBeenCalledWith(9);
  });
});

describe("FormField component", () => {
  it("renders label, helper text, and links error aria-describedby", () => {
    render(
      <FormField id="test-field" label="Email" error="Invalid email address">
        <Input placeholder="name@domain.com" />
      </FormField>
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("name@domain.com");
    expect(input).toHaveAttribute("aria-describedby", "test-field-error");
  });
});

describe("StatTile component", () => {
  it("displays scoreboard number and trend label", () => {
    render(
      <StatTile
        label="Total Points"
        value="12,500"
        trend="up"
        trendLabel="+500"
      />
    );
    expect(screen.getByText("Total Points")).toBeInTheDocument();
    expect(screen.getByText("12,500")).toBeInTheDocument();
    expect(screen.getByText("↑ +500")).toBeInTheDocument();
  });
});

describe("LiveStrip component", () => {
  it("renders live banner and dismisses on click", () => {
    render(
      <LiveStrip
        title="Live Tournament Auction"
        href="/tournaments/test/auction"
      />
    );
    expect(screen.getByText("Live Tournament Auction")).toBeInTheDocument();
    const dismissBtn = screen.getByRole("button", { name: "Dismiss banner" });
    fireEvent.click(dismissBtn);
    expect(screen.queryByText("Live Tournament Auction")).not.toBeInTheDocument();
  });
});

describe("ConfirmDialog component", () => {
  it("names the item being changed and calls onConfirm", async () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete Team"
        itemName="Raipur Royals"
        description="Are you sure you want to remove this team?"
        onConfirm={handleConfirm}
      />
    );
    expect(screen.getByText(/Delete Team/)).toBeInTheDocument();
    expect(screen.getByText(/“Raipur Royals”/)).toBeInTheDocument();
    const confirmBtn = screen.getByRole("button", { name: "Confirm" });

    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
