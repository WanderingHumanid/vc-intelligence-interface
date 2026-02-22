"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Bookmark, Save, LayoutDashboard } from "lucide-react";

export function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: "Companies", href: "/companies", icon: Building2 },
        { name: "Lists", href: "/lists", icon: Bookmark },
        { name: "Saved Searches", href: "/saved", icon: Save },
    ];

    return (
        <div className="w-64 bg-slate-50 border-r border-slate-200 h-screen fixed top-0 left-0 flex flex-col items-start px-4 py-6 z-10">
            <div className="flex items-center gap-2 mb-10 w-full px-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className="font-semibold text-lg text-slate-900 tracking-tight">Intelligence</span>
            </div>

            <nav className="flex flex-col gap-2 w-full">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${isActive
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                }`}
                        >
                            <item.icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
