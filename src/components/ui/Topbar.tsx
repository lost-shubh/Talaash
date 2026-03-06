'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

export function Topbar() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const router = useRouter();

  const active = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const handleLogout = async () => {
    await logout();
    toast('Signed out successfully', 'success');
    router.push('/');
  };

  return (
    <nav className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="logo">
          TALAASH
          <span className="logo-sub">Missing Person Registry</span>
        </Link>
        <div className="nav">
          <Link href="/" className={`nav-btn${active('/') && pathname === '/' ? ' active' : ''}`}>Browse</Link>
          <Link href="/search" className={`nav-btn${active('/search') ? ' active' : ''}`}>Search</Link>
          <Link href="/report" className={`nav-btn${active('/report') ? ' active' : ''}`}>+ Report</Link>
          {user && <Link href="/my-reports" className={`nav-btn${active('/my-reports') ? ' active' : ''}`}>My Reports</Link>}
          {user?.role === 'admin' && (
            <Link href="/admin" className={`nav-btn${active('/admin') ? ' active' : ''}`}>⚙ Admin</Link>
          )}
          {user ? (
            <button className="nav-btn danger" onClick={handleLogout}>Logout</button>
          ) : (
            <Link href="/login" className={`nav-btn${active('/login') ? ' active' : ''}`}>Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
