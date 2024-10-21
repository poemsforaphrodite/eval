'use client';

import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

interface ClientComponentProps {
  username: string | undefined;
}

export default function ClientComponent({ username }: ClientComponentProps) {
  const router = useRouter();

  const handleLogout = () => {
    // Implement logout logic here
    // For example:
    // clearCookies();
    router.push('/login');
  };

  return <Sidebar onLogout={handleLogout} />;
}
