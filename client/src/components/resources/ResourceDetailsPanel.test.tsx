import { describe, it, expect, vi } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResourceDetailsPanel } from "./ResourceDetailsPanel";
import type { ResourceRead } from "@/generated/types";

const mockResources: ResourceRead[] = [
  {
    id: "r1",
    name: "Resource 1",
    uri: "file:///test/1",
    enabled: true,
    description: "First resource",
    mimeType: "text/plain",
    size: 1024,
    tags: ["tag1", "tag2"],
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
  {
    id: "r2",
    name: "Resource 2",
    uri: "file:///test/2",
    enabled: false,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
];

describe("ResourceDetailsPanel", () => {
  it("renders the panel with gateway slug", () => {
    renderWithProviders(
      <ResourceDetailsPanel
        resources={mockResources}
        gatewaySlug="my-gateway"
        open={true}
        onClose={vi.fn()}
        onDeleteResource={vi.fn()}
      />,
    );
    expect(screen.getByText("my-gateway Resources")).toBeInTheDocument();
  });

  it("renders a list of resources with their details", () => {
    renderWithProviders(
      <ResourceDetailsPanel
        resources={mockResources}
        gatewaySlug="my-gateway"
        open={true}
        onClose={vi.fn()}
        onDeleteResource={vi.fn()}
      />,
    );

    expect(screen.getByText("Resource 1")).toBeInTheDocument();
    expect(screen.getByText("file:///test/1")).toBeInTheDocument();
    expect(screen.getByText("First resource")).toBeInTheDocument();
    expect(screen.getByText("text/plain")).toBeInTheDocument();
    expect(screen.getByText("1 KB")).toBeInTheDocument(); // 1024 bytes (format bytes is 1 KB)
    expect(screen.getByText("tag1")).toBeInTheDocument();
    expect(screen.getByText("tag2")).toBeInTheDocument();

    expect(screen.getByText("Resource 2")).toBeInTheDocument();
    expect(screen.getByText("file:///test/2")).toBeInTheDocument();
  });

  it("calls onDeleteResource when delete button is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderWithProviders(
      <ResourceDetailsPanel
        resources={mockResources}
        gatewaySlug="my-gateway"
        open={true}
        onClose={vi.fn()}
        onDeleteResource={onDelete}
      />,
    );

    const deleteBtns = screen.getAllByRole("button", { name: /Delete Resource/i });
    expect(deleteBtns.length).toBe(2);

    await user.click(deleteBtns[0]);
    expect(onDelete).toHaveBeenCalledWith("r1");
  });
});
