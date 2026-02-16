/**
 * @file SettingsTab component tests.
 *
 * Verifies that the SettingsTab component handles tag management correctly:
 * fetching tags, editing tags, deleting tags, and handling various states.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsTab from "./SettingsTab";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.confirm and window.alert
const mockConfirm = vi.fn();
const mockAlert = vi.fn();

describe("SettingsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up window methods
    window.confirm = mockConfirm;
    window.alert = mockAlert;
  });

  afterEach(() => {
    cleanup();
  });

  describe("Initial render and loading state", () => {
    it("renders General Settings section", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<SettingsTab />);

      expect(
        screen.getByRole("heading", { name: "General Settings" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Configure site settings and preferences"),
      ).toBeInTheDocument();
      expect(screen.getByText("More settings coming soon...")).toBeInTheDocument();
    });

    it("renders Category / Tag Editor section", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<SettingsTab />);

      expect(
        screen.getByRole("heading", { name: "Category / Tag Editor" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Edit or delete tags used to categorize projects. Changes apply to all projects using that tag./,
        ),
      ).toBeInTheDocument();
    });

    it("displays loading state initially", () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise(() => {
            // Never resolves to keep loading state
          }),
      );

      render(<SettingsTab />);

      expect(screen.getByText("Loading tags...")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("displays error message when fetch fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("displays error message when API returns error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Failed to fetch tags")).toBeInTheDocument();
      });
    });
  });

  describe("Empty state", () => {
    it("displays message when no tags exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "No tags yet. Add tags when creating or editing projects.",
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Tags list rendering", () => {
    const mockTags = [
      { id: "1", name: "Residential", projectCount: 5 },
      { id: "2", name: "Commercial", projectCount: 2 },
      { id: "3", name: "Custom", projectCount: 0 },
    ];

    it("renders list of tags with project counts", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags,
      });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Residential")).toBeInTheDocument();
        expect(screen.getByText("(5 projects)")).toBeInTheDocument();
        expect(screen.getByText("Commercial")).toBeInTheDocument();
        expect(screen.getByText("(2 projects)")).toBeInTheDocument();
        expect(screen.getByText("Custom")).toBeInTheDocument();
        expect(screen.getByText("(0 projects)")).toBeInTheDocument();
      });
    });

    it("renders singular 'project' for count of 1", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "1", name: "Test", projectCount: 1 }],
      });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("(1 project)")).toBeInTheDocument();
      });
    });

    it("renders Edit and Delete buttons for each tag", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags,
      });

      render(<SettingsTab />);

      await waitFor(() => {
        const editButtons = screen.getAllByRole("button", { name: "Edit" });
        const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
        expect(editButtons).toHaveLength(3);
        expect(deleteButtons).toHaveLength(3);
      });
    });
  });

  describe("Edit tag flow", () => {
    const mockTags = [
      { id: "1", name: "Residential", projectCount: 5 },
      { id: "2", name: "Commercial", projectCount: 2 },
    ];

    beforeEach(() => {
      // Reset fetch mock for each test
      mockFetch.mockReset();
    });

    it("enters edit mode when Edit button is clicked", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags,
      });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Residential")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      const input = screen.getByDisplayValue("Residential");
      expect(input).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("allows editing tag name in input field", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags,
      });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Residential")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      const input = screen.getByDisplayValue("Residential");
      await user.clear(input);
      await user.type(input, "Residential Updated");

      expect(input).toHaveValue("Residential Updated");
    });

    it("saves tag edit successfully", async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTags,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { id: "1", name: "Residential Updated", projectCount: 5 },
            ...mockTags.slice(1),
          ],
        });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Residential")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      const input = screen.getByDisplayValue("Residential");
      await user.clear(input);
      await user.type(input, "Residential Updated");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/tags/1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: "Residential Updated" }),
        });
      });

      await waitFor(() => {
        expect(screen.getByText("Residential Updated")).toBeInTheDocument();
      });
    });

    it("disables Save button when input is empty", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags,
      });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Residential")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      const input = screen.getByDisplayValue("Residential");
      await user.clear(input);

      const saveButton = screen.getByRole("button", { name: "Save" });
      expect(saveButton).toBeDisabled();
    });

    it("disables Save button when saving", async () => {
      const user = userEvent.setup();
      let resolveSave: () => void;
      const savePromise = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTags,
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              // Store resolve function to keep promise pending
              resolveSave = resolve as () => void;
            }),
        );

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Residential")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      await waitFor(() => {
        const savingButton = screen.getByRole("button", { name: "Saving..." });
        expect(savingButton).toBeDisabled();
      });

      // Clean up: resolve the promise to prevent hanging
      resolveSave!();
    });

    it("cancels edit mode when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags,
      });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Residential")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText("Residential")).toBeInTheDocument();
        expect(screen.queryByDisplayValue("Residential")).not.toBeInTheDocument();
      });
    });

    it("saves on Enter key press", async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTags,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { id: "1", name: "Residential Updated", projectCount: 5 },
            ...mockTags.slice(1),
          ],
        });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Residential")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      const input = screen.getByDisplayValue("Residential");
      await user.clear(input);
      await user.type(input, "Residential Updated{Enter}");

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/tags/1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: "Residential Updated" }),
        });
      });
    });

    it("cancels on Escape key press", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags,
      });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Residential")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      const input = screen.getByDisplayValue("Residential");
      await user.type(input, "{Escape}");

      await waitFor(() => {
        expect(screen.queryByDisplayValue("Residential")).not.toBeInTheDocument();
      });
    });

    it("displays alert when save fails", async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTags,
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Tag name already exists" }),
        });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Residential")).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await user.click(editButtons[0]);

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("Tag name already exists");
      });
    });
  });

  describe("Delete tag flow", () => {
    const mockTags = [
      { id: "1", name: "Residential", projectCount: 5 },
      { id: "2", name: "Commercial", projectCount: 0 },
    ];

    beforeEach(() => {
      // Reset fetch mock for each test
      mockFetch.mockReset();
    });

    it("shows confirmation dialog for tag with projects", async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(false); // Cancel deletion
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags,
      });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Residential")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      await user.click(deleteButtons[0]);

      expect(mockConfirm).toHaveBeenCalledWith(
        '"Residential" is used by 5 project(s). Remove it from all projects?',
      );
    });

    it("shows confirmation dialog for tag without projects", async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(false); // Cancel deletion
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags,
      });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Commercial")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      await user.click(deleteButtons[1]);

      expect(mockConfirm).toHaveBeenCalledWith('Delete tag "Commercial"?');
    });

    it("deletes tag successfully when confirmed", async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(true); // Confirm deletion
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTags,
        })
        .mockResolvedValueOnce({
          ok: true,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockTags[0]], // Commercial deleted
        });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Commercial")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      await user.click(deleteButtons[1]);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/tags/2", {
          method: "DELETE",
          credentials: "include",
        });
      });

      await waitFor(() => {
        expect(screen.queryByText("Commercial")).not.toBeInTheDocument();
        expect(screen.getByText("Residential")).toBeInTheDocument();
      });
    });

    it("does not delete tag when confirmation is cancelled", async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(false); // Cancel deletion
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags,
      });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Commercial")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      await user.click(deleteButtons[1]);

      expect(mockFetch).toHaveBeenCalledTimes(1); // Only initial fetch
      expect(screen.getByText("Commercial")).toBeInTheDocument();
    });

    it("disables Delete button while deleting", async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(true);
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTags,
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              // Store resolve function to keep promise pending
              resolveDelete = resolve as () => void;
            }),
        );

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Commercial")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      await user.click(deleteButtons[1]);

      await waitFor(() => {
        const deletingButton = screen.getByRole("button", { name: "Deleting..." });
        expect(deletingButton).toBeDisabled();
      });

      // Clean up: resolve the promise to prevent hanging
      resolveDelete!();
    });

    it("displays alert when delete fails", async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(true);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTags,
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      render(<SettingsTab />);

      await waitFor(() => {
        expect(screen.getByText("Commercial")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      await user.click(deleteButtons[1]);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("Failed to delete tag");
      });
    });
  });
});
