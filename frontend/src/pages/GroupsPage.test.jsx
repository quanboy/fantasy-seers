import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GroupsPage from "./GroupsPage";

const groupMocks = vi.hoisted(() => ({
  getMyGroups: vi.fn(),
  getMyInvites: vi.fn(),
  createGroup: vi.fn(),
  joinGroup: vi.fn(),
  acceptInvite: vi.fn(),
  rejectInvite: vi.fn(),
}));

vi.mock("../api/client", () => ({ groupsApi: groupMocks }));

describe("GroupsPage", () => {
  beforeEach(() => {
    groupMocks.getMyGroups.mockResolvedValue({ data: [] });
    groupMocks.getMyInvites.mockResolvedValue({ data: [] });
  });

  it("explains that joining a group is separate from registration", async () => {
    render(
      <MemoryRouter>
        <GroupsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/group invite code is separate from your registration code/i)).toBeInTheDocument();
    expect(await screen.findByText(/No groups yet\. Create one or enter a group invite code above\./i)).toBeInTheDocument();
  });
});
