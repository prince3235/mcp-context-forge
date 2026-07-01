import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VirtualServerDetailsPanel } from "./VirtualServerDetailsPanel";
import type { VirtualServer } from "@/types/server";
import { useQuery } from "@/hooks/useQuery";
import { copyToClipboard } from "@/components/gateways/utils";

// Mock the query hook
vi.mock("@/hooks/useQuery", () => ({
  useQuery: vi.fn(),
}));

vi.mock("@/components/gateways/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/gateways/utils")>();
  return {
    ...actual,
    copyToClipboard: vi.fn(),
  };
});

const mockServer: VirtualServer = {
  id: "vs-1",
  name: "My Virtual Server",
  enabled: true,
  visibility: "team",
  oauthEnabled: true,
  tags: ["api", "test"],
  associatedTools: ["tool1", "tool2"],
  associatedResources: ["res1"],
  associatedPrompts: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
  description: "Test description",
};

describe("VirtualServerDetailsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useQuery as any).mockImplementation((path: string) => {
      if (path.includes("/tools")) {
        return { data: { tools: [{ id: "t1", name: "tool1", originalName: "tool1", gatewayId: "gw1" }] }, isLoading: false };
      }
      if (path.includes("/resources")) {
        return { data: { resources: [{ id: "r1", name: "res1", uri: "res1", gatewayId: "gw1" }] }, isLoading: false };
      }
      if (path.includes("/prompts")) {
        return { data: { prompts: [] }, isLoading: false };
      }
      if (path.includes("/gateways")) {
        return { data: { gateways: [{ id: "gw1", name: "Gateway 1" }] }, isLoading: false };
      }
      return { data: null, isLoading: false };
    });
  });

  it("renders server name and description", () => {
    renderWithProviders(
      <VirtualServerDetailsPanel
        server={mockServer}
        open={true}
        error={null}
        onClose={vi.fn()}
        onAddSources={vi.fn()}
      />
    );
    expect(screen.getByText("My Virtual Server")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("handles empty description and different visibility types", () => {
    renderWithProviders(
      <VirtualServerDetailsPanel
        server={{ ...mockServer, description: undefined, visibility: "public" }}
        open={true}
        error={null}
        onClose={vi.fn()}
        onAddSources={vi.fn()}
      />
    );
    expect(screen.getByText(/No description provided/i)).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("handles private and undefined visibility types", () => {
    const { rerender } = renderWithProviders(
      <VirtualServerDetailsPanel
        server={{ ...mockServer, visibility: "private" }}
        open={true}
        error={null}
        onClose={vi.fn()}
        onAddSources={vi.fn()}
      />
    );
    expect(screen.getByText("Private")).toBeInTheDocument();

    rerender(
      <VirtualServerDetailsPanel
        server={{ ...mockServer, visibility: undefined as any }}
        open={true}
        error={null}
        onClose={vi.fn()}
        onAddSources={vi.fn()}
      />
    );
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
  });

  it("renders the close button and calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <VirtualServerDetailsPanel
        server={mockServer}
        open={true}
        error={null}
        onClose={onClose}
        onAddSources={vi.fn()}
      />
    );
    const closeBtn = screen.getByRole("button", { name: /close/i });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("handles keyboard navigation between component filter tabs", async () => {
    renderWithProviders(
      <VirtualServerDetailsPanel
        server={mockServer}
        open={true}
        error={null}
        onClose={vi.fn()}
        onAddSources={vi.fn()}
      />
    );
    
    const tabs = screen.getAllByRole("tab");
    const allTab = tabs.find(t => t.textContent === "All")!;
    allTab.focus();
    
    fireEvent.keyDown(allTab, { key: "ArrowRight" });
    const toolsTab = document.activeElement;
    expect(toolsTab?.textContent).toBe("Tools");
    
    fireEvent.keyDown(toolsTab!, { key: "ArrowLeft" });
    expect(document.activeElement?.textContent).toBe("All");
  });

  it("handles keyboard navigation between source filter tabs", async () => {
    renderWithProviders(
      <VirtualServerDetailsPanel
        server={mockServer}
        open={true}
        error={null}
        onClose={vi.fn()}
        onAddSources={vi.fn()}
      />
    );
    
    // Wait for sources to load
    await waitFor(() => {
      expect(screen.getByText("All sources")).toBeInTheDocument();
    });
    
    const allSourcesTab = screen.getByText("All sources");
    allSourcesTab.focus();
    
    fireEvent.keyDown(allSourcesTab, { key: "ArrowRight" });
    expect(document.activeElement?.textContent).toBe("Gateway 1");
    
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement?.textContent).toBe("All sources");
  });

  it("filters components by search query", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <VirtualServerDetailsPanel
        server={mockServer}
        open={true}
        error={null}
        onClose={vi.fn()}
        onAddSources={vi.fn()}
      />
    );
    
    const searchButton = screen.getByRole("button", { name: "Search components" });
    await user.click(searchButton);
    
    const searchInput = screen.getByPlaceholderText("Search...");
    // focus and type
    fireEvent.focus(searchInput);
    await user.type(searchInput, "tool1");
    
    expect(screen.getByText("tool1")).toBeInTheDocument();
    expect(screen.queryByText("res1")).not.toBeInTheDocument();
    
    // blur while having text
    fireEvent.blur(searchInput);
  });

  it("closes on ESC key", () => {
    const onClose = vi.fn();
    renderWithProviders(
      <VirtualServerDetailsPanel
        server={mockServer}
        open={true}
        error={null}
        onClose={onClose}
        onAddSources={vi.fn()}
      />
    );
    
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("handles copy to clipboard for server ID and components", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <VirtualServerDetailsPanel
        server={mockServer}
        open={true}
        error={null}
        onClose={vi.fn()}
        onAddSources={vi.fn()}
      />
    );
    
    const copyButtons = screen.getAllByRole("button", { name: /Copy/i });
    expect(copyButtons.length).toBeGreaterThan(0);
    
    await user.click(copyButtons[0]);
    expect(copyToClipboard).toHaveBeenCalled();
  });

  it("shows error alert when error is provided", () => {
    renderWithProviders(
      <VirtualServerDetailsPanel
        server={mockServer}
        open={true}
        error={{ message: "Test Error" }}
        onClose={vi.fn()}
        onAddSources={vi.fn()}
      />
    );
    expect(screen.getByText("Test Error")).toBeInTheDocument();
  });

  it("handles click on Add Source button", async () => {
    const onAddSources = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <VirtualServerDetailsPanel
        server={mockServer}
        open={true}
        error={null}
        onClose={vi.fn()}
        onAddSources={onAddSources}
      />
    );
    
    const btn = screen.getByRole("button", { name: /Add Source/i });
    await user.click(btn);
    expect(onAddSources).toHaveBeenCalled();
  });

  it("filters components by source tab click", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <VirtualServerDetailsPanel
        server={mockServer}
        open={true}
        error={null}
        onClose={vi.fn()}
        onAddSources={vi.fn()}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText("Gateway 1")).toBeInTheDocument();
    });
    
    await user.click(screen.getByText("Gateway 1"));
    expect(screen.getByText("tool1")).toBeInTheDocument();
    
    // Test filter that does not exist to reset to 'all' implicitly if source vanishes (covered by logic)
  });
});
