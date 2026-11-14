import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { companies } from "@/lib/ecosystem";
import { CompanyProfilePanel } from "@/components/company-profile-panel";

const props = {
  company: companies[0],
  canEdit: false,
  isStaff: false,
  canRequestReview: false,
  editing: false,
  setEditing: vi.fn(),
  updated: vi.fn(async () => {}),
  pendingReview: false,
  onClose: vi.fn(),
};

describe("one side panel", () => {
  it("redraws details inside the same panel instead of opening a second one", () => {
    const { container, rerender } = render(<CompanyProfilePanel {...props} />);
    const panel = container.querySelector("aside");
    expect(screen.getByRole("heading", { name: companies[0].name })).toBeInTheDocument();

    rerender(<CompanyProfilePanel {...props} replacement={<h2>Opportunity details</h2>} />);
    expect(container.querySelectorAll("aside")).toHaveLength(1);
    expect(container.querySelector("aside")).toBe(panel);
    expect(screen.getByRole("heading", { name: "Opportunity details" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: companies[0].name })).toBeNull();

    rerender(<CompanyProfilePanel {...props} />);
    expect(container.querySelector("aside")).toBe(panel);
    expect(screen.getByRole("heading", { name: companies[0].name })).toBeInTheDocument();
  });
});
