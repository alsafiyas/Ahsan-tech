'use client';

import React from 'react';

export interface Customer {
  id: string;
  type: 'physical' | 'legal';
  name: string;
  company?: string;
  phone: string;
  telegram?: string;
  email?: string;
  address: string;
  district?: string;
  city: string;
  status: 'active' | 'inactive' | 'vip';
  totalContracts: number;
  totalDebt: number;
  lastActivity: string;
  avatar?: string;
}

export const customers: Customer[] = [
  {
    id: 'c1',
    type: 'physical',
    name: 'Akbar Yusupov',
    phone: '+998 90 123 45 67',
    telegram: '@akbar_y',
    email: 'akbar@gmail.com',
    address: 'Chilonzor tumani, 9-mavze, 12-uy',
    city: 'Toshkent',
    district: 'Chilonzor',
    status: 'vip',
    totalContracts: 3,
    totalDebt: 0,
    lastActivity: '2026-07-14',
  },
  {
    id: 'c2',
    type: 'legal',
    name: 'Sardor Mirzayev',
    company: 'Mirzayev Security LLC',
    phone: '+998 91 234 56 78',
    telegram: '@sardor_m',
    email: 'sardor@mirzayev.uz',
    address: 'Yunusobod tumani, 19-mavze',
    city: 'Toshkent',
    district: 'Yunusobod',
    status: 'active',
    totalContracts: 5,
    totalDebt: 1200000,
    lastActivity: '2026-07-12',
  },
  {
    id: 'c3',
    type: 'legal',
    name: 'Nodira Karimova',
    company: 'Karimova Trade Group',
    phone: '+998 93 345 67 89',
    email: 'nodira@karimova.uz',
    address: 'Mirzo Ulugbek tumani, 5-mavze',
    city: 'Toshkent',
    district: 'Mirzo Ulugbek',
    status: 'active',
    totalContracts: 2,
    totalDebt: 0,
    lastActivity: '2026-07-10',
  },
  {
    id: 'c4',
    type: 'physical',
    name: 'Jasur Toshmatov',
    phone: '+998 94 456 78 90',
    telegram: '@jasur_t',
    address: 'Shayxontohur tumani, Navruz ko\'chasi 7',
    city: 'Toshkent',
    district: 'Shayxontohur',
    status: 'active',
    totalContracts: 1,
    totalDebt: 450000,
    lastActivity: '2026-07-08',
  },
  {
    id: 'c5',
    type: 'legal',
    name: 'Dilnoza Xasanova',
    company: 'Xasanova Holding',
    phone: '+998 95 567 89 01',
    email: 'dilnoza@xasanova.uz',
    telegram: '@dilnoza_x',
    address: 'Uchtepa tumani, Bog\'ishamol ko\'chasi 15',
    city: 'Toshkent',
    district: 'Uchtepa',
    status: 'vip',
    totalContracts: 8,
    totalDebt: 0,
    lastActivity: '2026-07-15',
  },
  {
    id: 'c6',
    type: 'physical',
    name: 'Bobur Rahimov',
    phone: '+998 97 678 90 12',
    address: 'Olmazor tumani, Qoratosh ko\'chasi 3',
    city: 'Toshkent',
    district: 'Olmazor',
    status: 'inactive',
    totalContracts: 1,
    totalDebt: 0,
    lastActivity: '2026-05-20',
  },
  {
    id: 'c7',
    type: 'legal',
    name: 'Feruza Nazarova',
    company: 'Nazarova Business Center',
    phone: '+998 98 789 01 23',
    email: 'feruza@nazarova.uz',
    address: 'Bektemir tumani, Sanoat ko\'chasi 22',
    city: 'Toshkent',
    district: 'Bektemir',
    status: 'active',
    totalContracts: 4,
    totalDebt: 800000,
    lastActivity: '2026-07-11',
  },
];

export function getCustomerById(id: string): Customer | undefined {
  return customers.find((c) => c.id === id);
}
