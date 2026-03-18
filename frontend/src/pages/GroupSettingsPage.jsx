import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { groupsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function GroupSettingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Rename state
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameMsg, setRenameMsg] = useState(null);

  // Kick state
  const [kickingId, setKickingId] = useState(null);
  const [confirmKick, setConfirmKick] = useState(null);

  // Leave state
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const fetchGroup = () => {
    groupsApi.getGroup(id)
      .then(({ data }) => {
        setGroup(data);
        setNewName(data.name);
      })
      .catch(err => setError(err.response?.data?.message ?? "Failed to load group"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchGroup(); }, [id]);

  const isOwner = group?.ownerUsername === user?.username;

  const handleRename = async (e) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === group.name) return;
    setRenaming(true);
    setRenameMsg(null);
    try {
      const { data } = await groupsApi.renameGroup(id, { name: newName.trim() });
      setGroup(data);
      setRenameMsg({ type: "success", text: "Group renamed!" });
    } catch (err) {
      setRenameMsg({ type: "error", text: err.response?.data?.message ?? "Failed to rename" });
    } finally {
      setRenaming(false);
    }
  };

  const handleKick = async (userId) => {
    setKickingId(userId);
    try {
      await groupsApi.kickMember(id, userId);
      setConfirmKick(null);
      fetchGroup();
    } catch (err) {
      alert(err.response?.data?.message ?? "Failed to kick member");
    } finally {
      setKickingId(null);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await groupsApi.leaveGroup(id);
      navigate("/groups");
    } catch (err) {
      alert(err.response?.data?.message ?? "Failed to leave group");
      setLeaving(false);
      setConfirmLeave(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {loading && (
        <div className="space-y-4">
          <div className="skeleton h-16" />
          <div className="skeleton h-40" />
        </div>
      )}

      {error && (
        <div className="glass-card p-8 text-center">
          <p className="text-loss-400 text-sm">{error}</p>
          <Link to="/groups" className="text-oracle-400 text-xs mt-2 inline-block hover:underline">
            Back to Groups
          </Link>
        </div>
      )}

      {!loading && !error && group && (
        <div className="animate-fade-in space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="font-cinzel text-xl font-bold text-slate-100">Group Settings</h1>
            <Link to={`/groups/${id}`} className="btn-ghost text-sm px-3 py-1.5">
              Back to Feed
            </Link>
          </div>

          {/* Rename (owner only) */}
          {isOwner && (
            <div className="glass-card rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Group Name</h2>
              <form onSubmit={handleRename} className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input-base flex-1 text-sm"
                  maxLength={100}
                />
                <button
                  type="submit"
                  disabled={renaming || !newName.trim() || newName.trim() === group.name}
                  className="btn-oracle text-sm"
                >
                  {renaming ? "Saving..." : "Rename"}
                </button>
              </form>
              {renameMsg && (
                <p className={`text-xs mt-2 ${renameMsg.type === "success" ? "text-win-400" : "text-loss-400"}`}>
                  {renameMsg.text}
                </p>
              )}
            </div>
          )}

          {/* Members */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">
              Members
              <span className="ml-2 chip-gold text-xs px-2 py-0.5 rounded-full">{group.memberCount}</span>
            </h2>
            <div className="space-y-2">
              {group.members.map(member => (
                <div key={member.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-void-950/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-200 font-medium">{member.username}</span>
                    {member.username === group.ownerUsername && (
                      <span className="bg-void-700 border border-void-600 text-slate-400 text-xs px-1.5 py-0.5 rounded">Owner</span>
                    )}
                  </div>
                  {isOwner && member.username !== group.ownerUsername && (
                    <>
                      {confirmKick === member.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleKick(member.id)}
                            disabled={kickingId === member.id}
                            className="btn-reject text-xs px-2.5 py-1"
                          >
                            {kickingId === member.id ? "Removing..." : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmKick(null)}
                            className="btn-ghost text-xs px-2.5 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmKick(member.id)}
                          className="text-loss-400 hover:text-loss-500 text-xs font-medium transition-colors"
                        >
                          Kick
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leave Group */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Leave Group</h2>
            <p className="text-slate-500 text-xs mb-3">
              {isOwner
                ? "Ownership will transfer to the next member. If you're the last member, the group will be deleted."
                : "You will lose access to this group's props and chat."}
            </p>
              {confirmLeave ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleLeave}
                    disabled={leaving}
                    className="btn-reject text-sm px-4 py-2"
                  >
                    {leaving ? "Leaving..." : "Yes, leave group"}
                  </button>
                  <button
                    onClick={() => setConfirmLeave(false)}
                    className="btn-ghost text-sm px-4 py-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmLeave(true)}
                  className="btn-reject text-sm px-4 py-2"
                >
                  Leave Group
                </button>
              )}
            </div>
        </div>
      )}
    </div>
  );
}
