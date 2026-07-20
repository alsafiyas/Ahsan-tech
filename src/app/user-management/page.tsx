"use client";

import React, { useState } from "react";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Lock, 
  KeyRound,
  LayoutDashboard,
  Wrench,
  UserCheck,
  CreditCard,
  Package,
  Settings,
  HelpCircle
} from "lucide-react";

// Tizimdagi mavjud bo'limlar ro'yxati (Ruxsatlar uchun)
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

// Rollar va ularning standart ruxsatnomalari
export interface RoleConfig {
  id: string;
  label: string;
  description: string;
  permissions: ModuleId[]; // Qaysi bo'limlarga kirish huquqi borligi
}

const INITIAL_ROLES: RoleConfig[] = [
  {
    id: "admin",
    label: "Administrator",
    description: "Tizimdagi barcha bo'lim va sozlamalarga to'liq kirish",
    permissions: ["dashboard", "service", "employees", "customers", "finance", "inventory", "settings"],
  },
  {
    id: "manager",
    label: "Menejer",
    description: "Asosiy ishchi bo'limlar va hisobotlarni boshqarish",
    permissions: ["dashboard", "service", "employees", "customers", "inventory"],
  },
  {
    id: "technician",
    label: "Texnik",
    description: "Faqat servis markazi va ta'mirlash ishlariga kirish",
    permissions: ["service", "inventory"],
  },
  {
    id: "operator",
    label: "Operator",
    description: "Mijozlar va qabul qilingan so'rovlar bilan ishlash",
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
    description: "Moliya, to'lovlar va hisobotlar bo'limi",
    permissions: ["dashboard", "finance", "customers"],
  },
];

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: "active" | "inactive";
}

export default function UserManagementPage() {
  const [roles, setRoles] = useState<RoleConfig[]>(INITIAL_ROLES);
  const [users, setUsers] = useState<User[]>([
    { id: "1", name: "Ali Valiyev", email: "ali@company.uz", roleId: "admin", status: "active" },
    { id: "2", name: "Sardor Rahimov", email: "sardor@company.uz", roleId: "technician", status: "active" },
  ]);

  const [activeTab, setActiveTab] = useState<"users" | "permissions">("users");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [userFormData, setUserFormData] = useState<{
    name: string;
    email: string;
    roleId: string;
    status: "active" | "inactive";
  }>({
    name: "",
    email: "",
    roleId: "operator",
    status: "active",
  });

  // Rol uchun ruxsatnomani yoqish/o'chirish
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
      setUserFormData({
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        status: user.status,
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        name: "",
        email: "",
        roleId: roles[0]?.id || "operator",
        status: "active",
      });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, ...userFormData } : u)));
    } else {
      setUsers([...users, { id: Date.now().toString(), ...userFormData }]);
    }
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm("Foydalanuvchini o'chirmoqchimisiz?")) {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Sarlavha */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Foydalanuvchilar va Ruxsatnomalar
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Foydalanuvchilarni boshqarish va har bir rol uchun bo'limlarga kirish huquqlarini sozlash
          </p>
        </div>

        {activeTab === "users" && (
          <button
            onClick={() => handleOpenUserModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <UserPlus className="w-4 h-4" />
            Yangi foydalanuvchi
          </button>
        )}
      </div>

      {/* Tablar (Foydalanuvchilar / Ruxsatnomalar sozlamasi) */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
            activeTab === "users"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Foydalanuvchilar ro'yxati
        </button>
        <button
          onClick={() => setActiveTab("permissions")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
            activeTab === "permissions"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Rollar va Bo'limlar ruxsati (Permissions)
        </button>
      </div>

      {/* TAB 1: FOYDALANUVCHILAR JADVALI */}
      {activeTab === "users" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm font-semibold">
                <th className="py-3 px-4">F.I.SH</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Rol / Lavozim</th>
                <th className="py-3 px-4">Holati</th>
                <th className="py-3 px-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {users.map((user) => {
                const roleObj = roles.find((r) => r.id === user.roleId);
                return (
                  <tr key={user.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-medium text-gray-900">{user.name}</td>
                    <td className="py-3 px-4 text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {roleObj?.label || user.roleId}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.status === "active" ? "Faol" : "Nofaol"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenUserModal(user)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-gray-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 text-gray-600 hover:text-red-600 rounded hover:bg-gray-100"
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

      {/* TAB 2: ROLLAR VA BO'LIMLAR RUXSATLAR MATRIXI */}
      {activeTab === "permissions" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto p-4">
          <p className="text-sm text-gray-600 mb-4">
            Quyidagi jadval orqali har bir rol uchun qaysi bo'limlarga kirish mumkinligini belgiling:
          </p>
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-4 text-sm font-semibold text-gray-700">Bo'limlar / Tizim</th>
                {roles.map((role) => (
                  <th key={role.id} className="py-3 px-4 text-center text-sm font-semibold text-gray-700">
                    <div>{role.label}</div>
                    <div className="text-[11px] font-normal text-gray-400">{role.id}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {MODULES.map((module) => {
                const Icon = module.icon;
                return (
                  <tr key={module.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-medium text-gray-800 flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      {module.label}
                    </td>
                    {roles.map((role) => {
                      const isAllowed = role.permissions.includes(module.id);
                      return (
                        <td key={role.id} className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={() => togglePermission(role.id, module.id)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
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

      {/* FOYDALANUVCHI QO'SHISH / TAHRIRLASH MODALI */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                {editingUser ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi qo'shish"}
              </h2>
              <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">F.I.SH</label>
                <input
                  type="text"
                  required
                  placeholder="Ism va familiya"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="example@domain.uz"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roli / Lavozimi</label>
                <select
                  value={userFormData.roleId}
                  onChange={(e) => setUserFormData({ ...userFormData, roleId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Holati</label>
                <select
                  value={userFormData.status}
                  onChange={(e) =>
                    setUserFormData({ ...userFormData, status: e.target.value as "active" | "inactive" })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="active">Faol</option>
                  <option value="inactive">Nofaol</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
