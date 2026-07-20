"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Edit2,
  Trash2,
  X,
  Check,
  UserCheck,
  LayoutDashboard,
  Wrench,
  CreditCard,
  Package,
  Settings,
  RefreshCw,
  Search
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Tizimdagi bo'limlar ro'yxati (Permissions matrix uchun)
export const MODULES = [
  { id: "dashboard", label: "Bosh sahifa (Dashboard)", icon: LayoutDashboard },
  { id: "service", label: "Servis markazi (Chiptalar)", icon: Wrench },
  { id: "employees", label: "Xodimlar bo'limi", icon: UserCheck },
  { id: "customers", label: "Mijozlar bazasi", icon: Users },
  { id: "finance", label: "Moliya va Buxgalteriya", icon: CreditCard },
  { id: "inventory", label: "Ombor va Mahsulotlar", icon: Package },
  { id: "settings", label: "Tizim sozlamalari", icon: Settings },
] as const;

export type ModuleId = typeof MODULES[number]["id"];

// Rol ta'riflari va standart ruxsatlar
export interface RoleConfig {
  id: string;
  label: string;
  description: string;
  permissions: ModuleId[];
}

const INITIAL_ROLES: RoleConfig[] = [
  {
    id: "admin",
    label: "Administrator",
    description: "Tizimga to'liq kirish va boshqarish huquqi",
    permissions: ["dashboard", "service", "employees", "customers", "finance", "inventory", "settings"],
  },
  {
    id: "manager",
    label: "Menejer",
    description: "Loyiha va xodimlarni boshqarish",
    permissions: ["dashboard", "service", "employees", "customers", "inventory"],
  },
  {
    id: "technician",
    label: "Texnik",
    description: "Servis markazi va ta'mirlash ishlarini olib borish",
    permissions: ["service", "inventory"],
  },
  {
    id: "operator",
    label: "Operator",
    description: "Mijozlar va kelgan chiptalar bilan ishlash",
    permissions: ["dashboard", "service", "customers"],
  },
  {
    id: "installer",
    label: "Montajchi",
    description: "O'rnatish va montaj buyurtmalarini ko'rish",
    permissions: ["service"],
  },
  {
    id: "accountant",
    label: "Buxgalter",
    description: "Moliya va hisob-kitoblar bo'limi",
    permissions: ["dashboard", "finance", "customers"],
  },
];

export interface Employee {
  id: string;
  full_name: string;
  email?: string;
  position?: string;
}

export interface UserProfile {
  id: string;
  employee_id?: string;
  full_name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  created_at?: string;
}

export default function UserManagementPage() {
  // Supabase client — komponent ichida bir marta yaratiladi
  const supabase = createClient();

  const [roles, setRoles] = useState<RoleConfig[]>(INITIAL_ROLES);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"users" | "permissions">("users");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [formData, setFormData] = useState<{
    full_name: string;
    email: string;
    role: string;
    status: "active" | "inactive";
  }>({
    full_name: "",
    email: "",
    role: "operator",
    status: "active",
  });

  // Supabase'dan foydalanuvchilar va xodimlarni yuklab olish
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Employees (Xodimlar) jadvalidan olish
      // Eslatma: "email" ustuni employees jadvalida mavjud emas,
      // shuning uchun select'dan olib tashlandi.
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("id, full_name, position")
        .eq("is_active", true);

      if (empError) {
        console.error("Xodimlarni yuklashda xatolik:", empError);
      }
      if (empData) setEmployees(empData);

      // 2. User Profiles / User Roles jadvalidan olish
      const { data: profilesData, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*");

      if (profilesError) {
        console.error("Foydalanuvchilarni yuklashda xatolik:", profilesError);
      }

      if (profilesData) {
        setUsers(profilesData);
      } else {
        // Zaxira ko'rinish
        setUsers([
          { id: "1", full_name: "Ali Valiyev", email: "ali@company.uz", role: "admin", status: "active" },
          { id: "2", full_name: "Sardor Rahimov", email: "sardor@company.uz", role: "technician", status: "active" }
        ]);
      }
    } catch (err) {
      console.error("Ma'lumotlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Xodimlardan birini tanlaganda ism va email avtomatik to'ldiriladi
  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setFormData((prev) => ({
        ...prev,
        full_name: emp.full_name,
        email: emp.email || `${emp.full_name.toLowerCase().replace(/\s+/g, ".")}@company.uz`,
      }));
    }
  };

  const togglePermission = (roleId: string, moduleId: ModuleId) => {
    setRoles((prevRoles) =>
      prevRoles.map((role) => {
        if (role.id === roleId) {
          const hasPermission = role.permissions.includes(moduleId);
          const newPermissions = hasPermission
            ? role.permissions.filter((p) => p !== moduleId)
            : [...role.permissions, moduleId];
          return { ...role, permissions: newPermissions };
        }
        return role;
      })
    );
  };

  const handleOpenModal = (user?: UserProfile) => {
    if (user) {
      setEditingUser(user);
      setSelectedEmployeeId(user.employee_id || "");
      setFormData({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status,
      });
    } else {
      setEditingUser(null);
      setSelectedEmployeeId("");
      setFormData({
        full_name: "",
        email: "",
        role: "operator",
        status: "active",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      // Supabase yangilash
      await supabase
        .from("user_profiles")
        .update({
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          employee_id: selectedEmployeeId || null,
        })
        .eq("id", editingUser.id);

      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, ...formData, employee_id: selectedEmployeeId } : u)));
    } else {
      // Yangi foydalanuvchi qo'shish
      const newUser: UserProfile = {
        id: Date.now().toString(),
        employee_id: selectedEmployeeId || undefined,
        ...formData,
      };
      await supabase.from("user_profiles").insert([newUser]);
      setUsers([...users, newUser]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Ushbu foydalanuvchini o'chirishga ishonchingiz komilmi?")) {
      await supabase.from("user_profiles").delete().eq("id", id);
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  const filteredUsers = users.filter((u) =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      {/* Sarlavha qismi */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-500" />
            Foydalanuvchilarni Boshqarish va Ruxsatnomalar
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Xodimlarni foydalanuvchi sifatida biriktirish va ularning bo'limlarga kirish huquqlarini sozlash
          </p>
        </div>
        {activeTab === "users" && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition font-medium shadow-lg shadow-blue-600/20"
          >
            <UserPlus className="w-4 h-4" />
            Yangi foydalanuvchi
          </button>
        )}
      </div>

      {/* Tablar (Foydalanuvchilar / Rollar va Ruxsatlar) */}
      <div className="flex border-b border-slate-700/60 gap-2">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-5 py-2.5 font-medium text-sm rounded-t-xl transition ${
            activeTab === "users"
              ? "bg-slate-800 text-blue-400 border-t border-x border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Foydalanuvchilar ro'yxati
        </button>
        <button
          onClick={() => setActiveTab("permissions")}
          className={`px-5 py-2.5 font-medium text-sm rounded-t-xl transition ${
            activeTab === "permissions"
              ? "bg-slate-800 text-blue-400 border-t border-x border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Rollar va Bo'limlar ruxsati (Permissions)
        </button>
      </div>

      {/* TAB 1: FOYDALANUVCHILAR JADVALI */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Qidiruv paneli */}
          <div className="relative max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="F.I.SH yoki Email bo'yicha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-700/60 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-4 px-5">Xodim F.I.SH</th>
                  <th className="py-4 px-5">Email</th>
                  <th className="py-4 px-5">Rol / Lavozim</th>
                  <th className="py-4 px-5">Holati</th>
                  <th className="py-4 px-5 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      Foydalanuvchilar topilmadi
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const roleObj = roles.find((r) => r.id === user.role);
                    return (
                      <tr key={user.id} className="hover:bg-slate-700/30 transition">
                        <td className="py-4 px-5 font-semibold text-white">{user.full_name}</td>
                        <td className="py-4 px-5 text-slate-300">{user.email}</td>
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Shield className="w-3 h-3" />
                            {roleObj?.label || user.role}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-slate-700 text-slate-400"
                            }`}
                          >
                            {user.status === "active" ? "Faol" : "Nofaol"}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right space-x-2">
                          <button
                            onClick={() => handleOpenModal(user)}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROLLAR VA BO'LIMLAR RUXSATLARI MATRIXI */}
      {activeTab === "permissions" && (
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 p-5 shadow-xl overflow-x-auto">
          <p className="text-sm text-slate-400 mb-4">
            Quyida har bir rol uchun tizim bo'limlariga kirish huquqlarini (Checkbox orqali) belgilashingiz mumkin:
          </p>
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-700">
                <th className="py-3 px-4 text-xs uppercase tracking-wider text-slate-400">Bo'limlar / Modullar</th>
                {roles.map((role) => (
                  <th key={role.id} className="py-3 px-4 text-center text-xs uppercase tracking-wider text-slate-300">
                    <div>{role.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40 text-sm">
              {MODULES.map((module) => {
                const Icon = module.icon;
                return (
                  <tr key={module.id} className="hover:bg-slate-700/20">
                    <td className="py-3.5 px-4 font-medium text-slate-200 flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-blue-400" />
                      {module.label}
                    </td>
                    {roles.map((role) => {
                      const isAllowed = role.permissions.includes(module.id);
                      return (
                        <td key={role.id} className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={() => togglePermission(role.id, module.id)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-600 bg-slate-900 focus:ring-blue-500 focus:ring-offset-slate-800 cursor-pointer"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL OYNA (Xodimlarni biriktirish / Qo'shish) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 border border-slate-700 shadow-2xl text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-700 pb-4">
              <h2 className="text-lg font-bold text-white">
                {editingUser ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi biriktirish"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Employees oynasidan xodimlarni tanlash dropdown'i */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Xodimni tanlang (Employees oynasidan)
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => handleSelectEmployee(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Xodimlardan tanlash (Ixtiyoriy) --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} {emp.position ? `(${emp.position})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Ism va Familiya</label>
                <input
                  type="text"
                  required
                  placeholder="Ali Valiyev"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email manzili</label>
                <input
                  type="email"
                  required
                  placeholder="ali@company.uz"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Roli / Lavozimi</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label} — {role.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Holati</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as "active" | "inactive" })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="active">Faol</option>
                  <option value="inactive">Nofaol</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-600 rounded-xl text-slate-300 hover:bg-slate-700 transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition font-medium"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
