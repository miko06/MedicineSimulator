import { useEffect, useState } from "react";
import { api } from "../../api/client";

interface UserRecord {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count?: { attempts: number };
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async (p: number) => {
    setLoading(true);
    const data = await api.admin.users.list(p, 20) as { data: UserRecord[]; pagination: { total: number } };
    setUsers(data.data);
    setTotal(data.pagination.total);
    setPage(p);
    setLoading(false);
  };

  useEffect(() => { load(1); }, []);

  const toggleRole = async (user: UserRecord) => {
    const newRole = user.role === "ADMIN" ? "STUDENT" : "ADMIN";
    await api.admin.users.changeRole(user.id, newRole);
    load(page);
  };

  const toggleActive = async (userId: string) => {
    await api.admin.users.toggleActive(userId);
    load(page);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Delete this user permanently?")) return;
    await api.admin.users.delete(userId);
    load(page);
  };

  const totalPages = Math.ceil(total / 20);

  if (loading) return <div className="text-muted text-sm p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-mono text-accent mb-6">Users ({total})</h1>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs text-muted font-normal">Email</th>
              <th className="px-4 py-3 text-xs text-muted font-normal">Role</th>
              <th className="px-4 py-3 text-xs text-muted font-normal">Status</th>
              <th className="px-4 py-3 text-xs text-muted font-normal">Attempts</th>
              <th className="px-4 py-3 text-xs text-muted font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/50 hover:bg-surface/50">
                <td className="px-4 py-3 text-text">{u.email}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleRole(u)} className={`text-xs px-2 py-0.5 rounded cursor-pointer ${u.role === "ADMIN" ? "bg-accent/10 text-accent" : "text-muted"}`}>
                    {u.role}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(u.id)} className={`text-xs ${u.isActive ? "text-green-400" : "text-red-400"}`}>
                    {u.isActive ? "Active" : "Blocked"}
                  </button>
                </td>
                <td className="px-4 py-3 text-muted text-xs">{u._count?.attempts ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(u.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} onClick={() => load(i + 1)} className={`w-8 h-8 rounded text-xs ${page === i + 1 ? "bg-accent text-bg" : "glass text-muted hover:text-text"}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
