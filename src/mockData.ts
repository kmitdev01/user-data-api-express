import { User } from './types/user';

export const mockUsers: User[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', plan: 'pro', isActive: true },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', plan: 'free', isActive: true },
  {
    id: '3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    plan: 'enterprise',
    isActive: false,
  },
  { id: '4', name: 'Diana Prince', email: 'diana@example.com', plan: 'pro', isActive: true },
  { id: '5', name: 'Evan Wright', email: 'evan@example.com', plan: 'free', isActive: true },
];
