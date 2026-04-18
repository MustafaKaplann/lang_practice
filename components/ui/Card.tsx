import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface CardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function Card({ href, icon: Icon, title, description }: CardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-emerald-500/50 hover:bg-slate-900 transition-all"
    >
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </Link>
  );
}
