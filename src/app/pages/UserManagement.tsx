import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { 
  Users, UserPlus, Mail, Shield, Smartphone, 
  Search, Filter, MoreVertical, CheckCircle2, 
  XCircle, Loader2, AlertCircle
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface StaffProfile {
  id: string;
  full_name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Field Agent';
  status: 'Active' | 'Inactive';
  created_at: string;
}

export default function UserManagement() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Mock data for demonstration - in real app, fetch from profiles table
    const mockStaff: StaffProfile[] = [
      { id: "1", full_name: "John Admin", email: "admin@coffee.com", role: "Admin", status: "Active", created_at: "2024-01-01" },
      { id: "2", full_name: "Sarah Agent", email: "sarah@coffee.com", role: "Field Agent", status: "Active", created_at: "2024-02-15" },
      { id: "3", full_name: "Mike Manager", email: "mike@coffee.com", role: "Manager", status: "Active", created_at: "2024-01-10" },
    ];
    
    setTimeout(() => {
      setStaff(mockStaff);
      setLoading(false);
    }, 800);
  }, []);

  const filteredStaff = staff.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout
      breadcrumbs={[{ label: "System" }, { label: "User Management" }]}
      title="User Management"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#14532D] text-white rounded-xl font-semibold hover:bg-[#1a6b35] transition-all"
        >
          <UserPlus size={18} />
          Add Agent
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Staff Member</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Joined</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <Loader2 className="w-8 h-8 text-green-700 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500">Loading staff member list...</p>
                </td>
              </tr>
            ) : filteredStaff.map((person) => (
              <tr key={person.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                      {person.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{person.full_name}</div>
                      <div className="text-xs text-gray-500">{person.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Shield size={14} className={person.role === 'Admin' ? 'text-blue-600' : 'text-gray-400'} />
                    <span className="font-medium">{person.role}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                    person.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {person.status === 'Active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {person.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(person.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-4 items-start">
        <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="text-sm font-bold text-blue-900">Security Note</h4>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            Agents accounts created here will receive an email to set their password. 
            Agents are restricted to only viewing farmers and entering new purchases. 
            They cannot view financial reports, price settings, or system configuration.
          </p>
        </div>
      </div>
    </Layout>
  );
}
