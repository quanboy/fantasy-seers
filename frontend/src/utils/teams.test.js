import { describe, expect, it } from "vitest";
import { getNflTeamInfo } from "./teams";

describe("getNflTeamInfo", () => {
  it("normalizes known Sleeper team codes into display and logo data", () => {
    expect(getNflTeamInfo("buf")).toEqual({
      code: "BUF",
      name: "Buffalo Bills",
      logoUrl: "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png",
    });
    expect(getNflTeamInfo("JAC")).toMatchObject({
      code: "JAX",
      name: "Jacksonville Jaguars",
    });
    expect(getNflTeamInfo("WSH")).toMatchObject({
      code: "WAS",
      name: "Washington Commanders",
    });
  });

  it("keeps unknown codes searchable and gives missing teams a free-agent identity", () => {
    expect(getNflTeamInfo("xyz")).toEqual({
      code: "XYZ",
      name: "XYZ",
      logoUrl: null,
    });
    expect(getNflTeamInfo(null)).toEqual({
      code: "FA",
      name: "Free Agent",
      logoUrl: null,
    });
  });
});
