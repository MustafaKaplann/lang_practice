import { cookies } from "next/headers";
import Link from "next/link";
import { LayoutDashboard, BookMarked, BookOpen, LogOut } from "lucide-react";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? "";
  const { username } = await verifySession(token);

  return (
    <div className="space-y-6">
      {/* Admin nav bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-medium text-emerald-400">
            Admin
          </span>
          <nav className="flex items-center gap-1">
            <AdminLink href="/admin" icon={<LayoutDashboard className="h-3.5 w-3.5" />}>
              Panel
            </AdminLink>
            <AdminLink href="/admin/words" icon={<BookMarked className="h-3.5 w-3.5" />}>
              Kelimeler
            </AdminLink>
            <AdminLink href="/admin/stories" icon={<BookOpen className="h-3.5 w-3.5" />}>
              Hikayeler
            </AdminLink>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          {username && <span className="text-xs">{username}</span>}
          <a
            href="/api/admin/logout"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-red-400 transition-colors text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            Çıkış
          </a>
        </div>
      </div>

      {children}
    </div>
  );
}

function AdminLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}
