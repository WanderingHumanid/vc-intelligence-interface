"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Bookmark, Save, LayoutDashboard, Search as SearchIcon, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [globalSearch, setGlobalSearch] = useState("");
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Prevent scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    const handleGlobalSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (globalSearch.trim()) {
            router.push(`/companies?q=${encodeURIComponent(globalSearch.trim())}`);
            setGlobalSearch("");
            setMobileOpen(false);
        }
    };

    const navItems = [
        { name: "Companies", href: "/companies", icon: Building2 },
        { name: "Lists", href: "/lists", icon: Bookmark },
        { name: "Saved Searches", href: "/saved", icon: Save },
    ];

    const sidebarContent = (
        <>
            <div className="flex items-center gap-2 mb-10 w-full px-2">
                <div className="w-8 h-8 rounded-lg bg-teal-600 dark:bg-teal-500 flex items-center justify-center text-white shrink-0">
                    <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className="font-semibold text-lg text-slate-900 dark:text-slate-50 tracking-tight">Intelligence</span>
            </div>

            <div className="w-full px-2 mb-6 cursor-pointer">
                <form onSubmit={handleGlobalSearch} className="relative">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Global Search..."
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 rounded-md text-sm outline-none transition-colors"
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
                                ? "bg-teal-50 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-50"
                                }`}
                        >
                            <item.icon className={`w-4 h-4 ${isActive ? "text-teal-600 dark:text-teal-400" : "text-slate-400 dark:text-slate-500"}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="mt-auto w-full pt-4 border-t border-slate-200 dark:border-slate-800 transition-colors">
                <ThemeToggle />
            </div>
        </>
    );

    return (
        <>
            {/* Mobile top bar — part of layout flow, not floating */}
            <div className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-slate-50/90 dark:bg-[#262624]/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    aria-label="Open menu"
                >
                    <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-teal-600 dark:bg-teal-500 flex items-center justify-center text-white">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-50 tracking-tight">Intelligence</span>
                </div>
            </div>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile sidebar (slide-in drawer) */}
            <div
                className={`lg:hidden fixed top-0 left-0 h-screen w-64 bg-slate-50 dark:bg-[#262624] border-r border-slate-200 dark:border-slate-800 flex flex-col items-start px-4 py-6 z-50 transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <button
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Close menu"
                >
                    <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
                {sidebarContent}
            </div>

            {/* Desktop sidebar (always visible) */}
            <div className="hidden lg:flex w-64 bg-slate-50 dark:bg-[#262624] border-r border-slate-200 dark:border-slate-800 h-screen fixed top-0 left-0 flex-col items-start px-4 py-6 z-10 transition-colors">
                {sidebarContent}
            </div>
        </>
    );
}
