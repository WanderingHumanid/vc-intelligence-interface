"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Bookmark, Save, LayoutDashboard, Search as SearchIcon } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [globalSearch, setGlobalSearch] = useState("");

    const handleGlobalSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (globalSearch.trim()) {
            router.push(`/companies?q=${encodeURIComponent(globalSearch.trim())}`);
            setGlobalSearch(""); // clear after search
        }
    };

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

            <div className="w-full px-2 mb-6 cursor-pointer">
                <form onSubmit={handleGlobalSearch} className="relative">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Global Search..."
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded-md text-sm outline-none transition-colors"
                    />
                </form>
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
            <div className="mt-auto w-full pt-4 border-t border-slate-200">
                <ThemeToggle />
            </div>
        </div>
    );
}
