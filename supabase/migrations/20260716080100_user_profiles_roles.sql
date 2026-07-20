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
  RefreshCw
} from "lucide-react";
// Agar loyihangizda Supabase ishlatilayotgan bo'lsa:
// import { supabase } from "@/lib/supabase/client";

// Tizimdagi bo'limlar ro'yxati (Ruxsatlar uchun)
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
    description: "Tizimga to'liq kirish huquqi",
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
    description: "Servis markazi va ta'mirlash chiptalari",
    permissions: ["service", "inventory"],
  },
  {
    id: "operator",
    label: "Operator",
    description: "Mijozlar va so'rovlar bilan ishlash",
    permissions: ["dashboard", "service", "customers"],
  },
  {
    id: "installer",
    label: "Montajchi",
    description: "O'rnatish va montaj buyurtmalari",
    permissions: ["service"],
  },
  {
    id: "accountant",
    label: "Buxgalter",
    description: "Moliya va hisobotlar",
    permissions: ["dashboard", "finance", "customers"],
  },
];

export interface Employee {
  id: string;
  full_name: string;
  email?: string;
  position?: string;
}

export interface User {
  id: string;
  employee_id?: string;
  name: string;
  email: string;
  roleId: string;
  status: "active" | "inactive";
}

export default function UserManagementPage() {
  const [roles, setRoles] = useState<RoleConfig[]>(INITIAL_ROLES);
  
  // Xodimlar oynasidan (Employees jadvalidan) keladigan ro'yxat
  const [employees, setEmployees] = useState<Employee[]>([
    { id: "emp-1", full_name: "Jasur Rahimov", email: "jasur@company.uz", position: "Texnik" },
    { id: "emp-2", full_name: "Anvar Karimov", email: "anvar@company.uz", position: "Montajchi" },
    { id: "emp-3", full_name: "Sardor Olimov", email: "sardor@company.uz", position: "Menejer" },
  ]);

  const [users, setUsers] = useState<User[]>([
    { id: "1", employee_id: "emp-3", name: "Sardor Olimov", email: "sardor@company.uz", roleId: "admin", status: "active" },
    { id: "2", employee_id: "emp-1", name: "Jasur Rahimov", email: "jasur@company.uz", roleId: "technician", status: "active" },
  ]);

  const [activeTab, setActiveTab] = useState<"users" | "permissions">("users");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [userFormData, setUserFormData] = useState<{
    name: string;
    email: string;
    roleId: string;
    status: "active" | "inactive";
  }>({
    name: "",
    email: "",
    roleId: "technician",
    status: "active",
  });

  // Supabase ishlatilayotgan bo'lsa, haqiqiy xodimlarni bazadan tortib olish funksiyasi:
  /*
  useEffect(() => {
    async function fetchEmployees() {
      const { data, error } = await supabase.from('employees').select('id, full_name, email, position');
      if (data && !error) {
        setEmployees(data);
      }
    }
    fetchEmployees();
  }, []);
  */

  // Xodim tanlanganda Ism va Email avtomatik to'ldiriladi
  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setUserFormData({
        ...userFormData,
        name: emp.full_name,
        email: emp.email || `${emp.full_name.toLowerCase().replace(/\s+/g, ".")}@company.uz`,
      });
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

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setSelectedEmployeeId(user.employee_id || "");
      setUserFormData({
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        status: user.status,
      });
    } else {
      setEditingUser(null);
      setSelectedEmployeeId(employees[0]?.id || "");
      if (employees[0]) {
        handleSelectEmployee(employees[0].id);
      }
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      setUsers(
        users.map((u) =>
          u.id === editingUser.id
            ? { ...u, ...userFormData, employee_id: selectedEmployeeId }
            : u
        )
      );
    } else {
      setUsers([
        ...users,
        {
          id: Date.now().toString(),
          employee_id: selectedEmployeeId,
          ...userFormData,
        },
      ]);
    }
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm("Foydalanuvchini o'chirmoqchimisiz?")) {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      {/* Sarlavha */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-500" />
            Foydalanuvchilar va Ruxsatnomalar
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Xodimlarni foydalanuvchi sifatida biriktirish va bo'limlarga kirish huquqlarini belgilash
          </p>
        </div>

        {activeTab === "users" && (
          <button
            onClick={() => handleOpenUserModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition font-medium shadow-lg shadow-blue-600/20"
          >
            <UserPlus className="w-4 h-4" />
            Yangi foydalanuvchi qo'shish
          </button>
        )}
      </div>

      {/* Tablar */}
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
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-700/60 text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-4 px-5">Xodim F.I.SH</th>
                <th className="py-4 px-5">Email</th>
                <th className="py-4 px-5">Rol / Lavozim</th>
                <th className="py-4 px-5">Holati</th>
                <th className="py-4 px-5 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40 text-sm">
              {users.map((user) => {
                const roleObj = roles.find((r) => r.id === user.roleId);
                return (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-4 px-5 font-semibold text-white">{user.name}</td>
                    <td className="py-4 px-5 text-slate-300">{user.email}</td>
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Shield className="w-3 h-3" />
                        {roleObj?.label || user.roleId}
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
                        onClick={() => handleOpenUserModal(user)}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: ROLLAR VA BO'LIMLAR RUXSATLARI */}
      {activeTab === "permissions" && (
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 p-5 shadow-xl overflow-x-auto">
          <p className="text-sm text-slate-400 mb-4">
            Quyida har bir rol uchun tizim bo'limlariga kirish huquqlarini tanlab qo'yishingiz mumkin:
          </p>
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-700">
                <th className="py-3 px-4 text-xs uppercase tracking-wider text-slate-400">Bo'limlar</th>
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

      {/* MODAL OYNA (Xodimlardan tanlab biriktirish) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 border border-slate-700 shadow-2xl text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-700 pb-4">
              <h2 className="text-lg font-bold text-white">
                {editingUser ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi qo'shish"}
              </h2>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {/* Xodimni Employees jadvalidan tanlash */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Xodimni tanlang (Xodimlar oynasidan)
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => handleSelectEmployee(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="" disabled>Xodimni tanlang...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} {emp.position ? `(${emp.position})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Rol / Tizimdagi lavozim
                </label>
                <select
                  value={userFormData.roleId}
                  onChange={(e) => setUserFormData({ ...userFormData, roleId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Holati
                </label>
                <select
                  value={userFormData.status}
                  onChange={(e) =>
                    setUserFormData({ ...userFormData, status: e.target.value as "active" | "inactive" })
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
                  onClick={() => setIsUserModalOpen(false)}
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
